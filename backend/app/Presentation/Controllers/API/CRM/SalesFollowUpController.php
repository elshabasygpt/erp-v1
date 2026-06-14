<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\CRM;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\CRM\SalesFollowUpModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SalesFollowUpController extends BaseController
{
    /**
     * Get follow-up tasks for the authenticated salesperson
     */
    public function index(Request $request): JsonResponse
    {
        $userId = auth()->id() ?? ''; // fallback
        $status = $request->query('status', 'pending');

        $query = SalesFollowUpModel::with('customer')
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
        $validated = $request->validate([
            'customer_id' => 'required|uuid|exists:customers,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'reminder_at' => 'nullable|date|before_or_equal:due_date',
        ]);

        $task = SalesFollowUpModel::create([
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
        $task = SalesFollowUpModel::find($id);

        if (!$task) {
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
