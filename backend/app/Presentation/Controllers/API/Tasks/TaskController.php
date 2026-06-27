<?php

namespace App\Presentation\Controllers\API\Tasks;

use App\Infrastructure\Eloquent\Models\TaskModel;
use App\Infrastructure\Eloquent\Models\TaskCommentModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $userId   = $request->user()->id;
        $tenantId = $this->getTenantId($request);

        $query = TaskModel::where('tenant_id', $tenantId)
            ->with(['creator:id,name', 'assignee:id,name'])
            ->withCount('comments');

        // فلتر العرض
        match ($request->query('view', 'mine')) {
            'mine'     => $query->where(fn($q) => $q->where('created_by', $userId)->orWhere('assigned_to', $userId)),
            'assigned' => $query->where('assigned_to', $userId),
            'created'  => $query->where('created_by', $userId),
            default    => null, // all — للمديرين
        };

        // فلاتر الحالة
        if ($request->filled('status'))   $query->where('status', $request->status);
        if ($request->filled('priority')) $query->where('priority', $request->priority);
        if ($request->filled('category')) $query->where('category', $request->category);
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($qr) => $qr->where('title', 'like', "%{$q}%")
                                         ->orWhere('description', 'like', "%{$q}%"));
        }

        // فلتر الوقت الذكي
        match ($request->query('due')) {
            'today'    => $query->whereDate('due_date', today())->whereNotIn('status', ['done','cancelled']),
            'overdue'  => $query->where('due_date', '<', today())->whereNotIn('status', ['done','cancelled']),
            'week'     => $query->whereBetween('due_date', [today(), today()->addDays(7)])->whereNotIn('status', ['done','cancelled']),
            'upcoming' => $query->where('due_date', '>=', today())->whereNotIn('status', ['done','cancelled']),
            default    => null,
        };

        $tasks = $query->orderByRaw("
            CASE status
                WHEN 'in_progress' THEN 1
                WHEN 'todo' THEN 2
                WHEN 'done' THEN 3
                WHEN 'cancelled' THEN 4
                ELSE 5
            END,
            CASE priority
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                ELSE 5
            END,
            due_date ASC NULLS LAST,
            created_at DESC
        ")->paginate((int) $request->query('per_page', 20));

        // أضف الـ computed attributes
        $tasks->getCollection()->transform(function ($task) {
            $task->is_overdue    = $task->is_overdue;
            $task->is_due_today  = $task->is_due_today;
            $task->days_until_due = $task->days_until_due;
            return $task;
        });

        return $this->paginated($tasks->toArray(), 'Tasks retrieved');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'         => 'required|string|max:500',
            'description'   => 'nullable|string',
            'priority'      => 'nullable|string|in:low,medium,high,urgent',
            'status'        => 'nullable|string|in:todo,in_progress,done,cancelled',
            'category'      => 'nullable|string|max:100',
            'color'         => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'due_date'      => 'nullable|date',
            'due_time'      => 'nullable|date_format:H:i',
            'reminder_at'   => 'nullable|date',
            'assigned_to'   => 'nullable|uuid|exists:users,id',
            'related_type'  => 'nullable|string|in:customer,invoice,supplier,employee,product,purchase',
            'related_id'    => 'nullable|uuid',
            'related_label' => 'nullable|string|max:200',
        ]);

        $task = new TaskModel($validated);
        $task->tenant_id  = $this->getTenantId($request);
        $task->created_by = $request->user()->id;
        $task->save();

        $task->load(['creator:id,name', 'assignee:id,name']);
        $task->is_overdue   = $task->is_overdue;
        $task->is_due_today = $task->is_due_today;

        return $this->success($task, 'Task created', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'title'         => 'sometimes|required|string|max:500',
            'description'   => 'nullable|string',
            'priority'      => 'nullable|string|in:low,medium,high,urgent',
            'status'        => 'nullable|string|in:todo,in_progress,done,cancelled',
            'category'      => 'nullable|string|max:100',
            'color'         => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'due_date'      => 'nullable|date',
            'due_time'      => 'nullable|date_format:H:i',
            'reminder_at'   => 'nullable|date',
            'assigned_to'   => 'nullable|uuid|exists:users,id',
            'related_type'  => 'nullable|string|in:customer,invoice,supplier,employee,product,purchase',
            'related_id'    => 'nullable|uuid',
            'related_label' => 'nullable|string|max:200',
        ]);

        $task = TaskModel::where('tenant_id', $this->getTenantId($request))->find($id);
        if (!$task) return $this->error('Task not found', 404);

        $task->fill($validated);

        if (isset($validated['status']) && $validated['status'] === 'done') {
            $task->completed_at = now();
        } elseif (isset($validated['status']) && $validated['status'] !== 'done') {
            $task->completed_at = null;
        }

        $task->save();

        return $this->success($task, 'Task updated');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $task = TaskModel::where('tenant_id', $this->getTenantId($request))->find($id);
        if (!$task) return $this->error('Task not found', 404);

        if ($task->created_by !== $request->user()->id && $task->assigned_to !== $request->user()->id) {
            return $this->error('Unauthorized', 403);
        }

        $task->delete();

        return $this->success(null, 'Task deleted');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:todo,in_progress,done,cancelled',
        ]);

        $task = TaskModel::where('tenant_id', $this->getTenantId($request))->find($id);
        if (!$task) return $this->error('Task not found', 404);

        $task->status = $validated['status'];
        $task->completed_at = $validated['status'] === 'done' ? now() : null;
        $task->save();

        return $this->success($task, 'Status updated');
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items'         => 'required|array',
            'items.*.id'    => 'required|uuid',
            'items.*.order' => 'required|integer',
            'items.*.status'=> 'required|string|in:todo,in_progress,done,cancelled',
        ]);

        DB::connection('tenant')->transaction(function () use ($validated) {
            foreach ($validated['items'] as $item) {
                TaskModel::where('id', $item['id'])->update([
                    'sort_order' => $item['order'],
                    'status'     => $item['status'],
                ]);
            }
        });

        return $this->success(null, 'Reordered');
    }

    public function getDashboard(Request $request): JsonResponse
    {
        $userId   = $request->user()->id;
        $tenantId = $this->getTenantId($request);

        $base = TaskModel::where('tenant_id', $tenantId)
            ->where(fn($q) => $q->where('created_by', $userId)->orWhere('assigned_to', $userId));

        return $this->success([
            'counts' => [
                'todo'       => (clone $base)->where('status', 'todo')->count(),
                'in_progress'=> (clone $base)->where('status', 'in_progress')->count(),
                'done_today' => (clone $base)->where('status', 'done')
                                 ->whereDate('completed_at', today())->count(),
                'overdue'    => (clone $base)->where('due_date', '<', today())
                                 ->whereNotIn('status', ['done','cancelled'])->count(),
                'due_today'  => (clone $base)->whereDate('due_date', today())
                                 ->whereNotIn('status', ['done','cancelled'])->count(),
            ],
            'urgent' => (clone $base)
                ->where('priority', 'urgent')
                ->whereNotIn('status', ['done','cancelled'])
                ->with(['assignee:id,name'])
                ->orderBy('due_date')
                ->limit(5)->get()
                ->map(fn($t) => [...$t->toArray(), 'is_overdue' => $t->is_overdue]),

            'due_today' => (clone $base)
                ->whereDate('due_date', today())
                ->whereNotIn('status', ['done','cancelled'])
                ->with(['assignee:id,name'])
                ->orderBy('priority')
                ->limit(10)->get()
                ->map(fn($t) => [...$t->toArray(), 'is_overdue' => $t->is_overdue]),

            'categories' => (clone $base)
                ->whereNotNull('category')
                ->selectRaw('category, color, COUNT(*) as count')
                ->groupBy('category', 'color')
                ->orderByDesc('count')
                ->limit(8)->get(),
        ]);
    }

    public function addComment(Request $request, string $id): JsonResponse
    {
        $task = TaskModel::where('tenant_id', $this->getTenantId($request))->find($id);
        if (!$task) return $this->error('Task not found', 404);

        $validated = $request->validate(['content' => 'required|string|max:2000']);

        $comment = TaskCommentModel::create([
            'tenant_id' => $this->getTenantId($request),
            'task_id'   => $task->id,
            'user_id'   => $request->user()->id,
            'content'   => $validated['content'],
        ]);

        return $this->success($comment->load('user:id,name'), 'Comment added', 201);
    }

    public function getCategories(Request $request): JsonResponse
    {
        $cats = TaskModel::where('tenant_id', $this->getTenantId($request))
            ->whereNotNull('category')
            ->selectRaw('category, color, COUNT(*) as count')
            ->groupBy('category', 'color')
            ->orderByDesc('count')
            ->get();

        return $this->success($cats);
    }
}
