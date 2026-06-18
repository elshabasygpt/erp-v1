<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\CRM;

use App\Infrastructure\Eloquent\Models\CRM\SalesFollowUpModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SalesFollowUpController extends BaseTenantController
{
    /**
     * Get follow-up tasks for the authenticated salesperson
     */
    public function index(Request $request): JsonResponse
    {
        $userId = auth()->id() ?? ''; // fallback
        $status = $request->query('status', 'pending');

        $query = SalesFollowUpModel::query()->where('tenant_id', $this->getTenantId($request))->with('customer')
            ->where('assigned_to', $userId)
            ->orderBy('due_date', 'asc');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $tasks = $query->get();

        return $this->success($tasks->toArray(), 'Follow-up tasks retrieved successfully');
    }

    /**
     * Create a new follow-up task
     */
    public function store(Request $request): JsonResponse
    {
        $validated['tenant_id'] = $this->getTenantId($request);
        $task = SalesFollowUpModel::query()->create([
            'tenant_id' => $this->getTenantId($request),
            'id' => Str::uuid()->toString(),
            'customer_id' => $validated['customer_id'],
            'assigned_to' => auth()->id() ?? '',
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'due_date' => $validated['due_date'] ?? null,
            'reminder_at' => $validated['reminder_at'] ?? null,
            'status' => 'pending',
        ]);

        return $this->created($task->toArray(), 'Follow-up task created successfully');
    }

    /**
     * Mark a follow-up task as completed
     */
    public function markCompleted(Request $request, string $id): JsonResponse
    {
        $task = SalesFollowUpModel::query()->where('tenant_id', $this->getTenantId($request))->find($id);

        if (! $task) {
            return $this->error('Follow-up task not found', 404);
        }

        // Optional: Ensure the assigned user is the one completing it, or an admin
        // if ($task->assigned_to !== auth()->id() && !auth()->user()->hasRole('admin')) {
        //     return $this->error('Unauthorized to complete this task', 403);
        // }

        $task->update(['status' => 'completed']);

        return $this->success($task->toArray(), 'Task marked as completed');
    }
}
