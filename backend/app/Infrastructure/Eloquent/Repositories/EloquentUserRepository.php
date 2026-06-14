<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Repositories;

use App\Domain\Auth\Entities\User;
use App\Domain\Auth\Repositories\UserRepositoryInterface;
use App\Infrastructure\Eloquent\Models\UserModel;

final class EloquentUserRepository implements UserRepositoryInterface
{
    public function findById(string $id): ?User
    {
        $model = UserModel::find($id);
        return $model ? $this->toDomain($model) : null;
    }

    public function findByEmail(string $email): ?User
    {
        $model = UserModel::where('email', $email)->first();
        return $model ? $this->toDomain($model) : null;
    }

    public function create(User $user): User
    {
        $model = UserModel::create([
            'id' => $user->getId(),
            'name' => $user->getName(),
            'email' => $user->getEmail(),
            'password' => $user->getPassword(),
            'role_id' => $user->getRoleId(),
            'is_active' => $user->isActive(),
            'phone' => $user->getPhone(),
            'locale' => $user->getLocale(),
            'created_by' => $user->getCreatedBy(),
        ]);
        return $this->toDomain($model);
    }

    public function update(User $user): User
    {
        UserModel::where('id', $user->getId())->update([
            'name' => $user->getName(),
            'email' => $user->getEmail(),
            'role_id' => $user->getRoleId(),
            'is_active' => $user->isActive(),
            'phone' => $user->getPhone(),
            'locale' => $user->getLocale(),
            'updated_by' => $user->getUpdatedBy(),
        ]);
        return $this->findById($user->getId());
    }

    public function delete(string $id): bool
    {
        return UserModel::where('id', $id)->delete() > 0;
    }

    public function paginate(int $perPage = 15, array $filters = []): array
    {
        $query = UserModel::with('role');
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'ilike', "%{$filters['search']}%")
                  ->orWhere('email', 'ilike', "%{$filters['search']}%");
            });
        }
        return $query->orderBy('created_at', 'desc')->paginate($perPage)->toArray();
    }

    private function toDomain(UserModel $model): User
    {
        return new User(
            id: $model->id,
            name: $model->name,
            email: $model->email,
            password: $model->password,
            roleId: $model->role_id,
            isActive: $model->is_active,
            phone: $model->phone,
            locale: $model->locale,
            createdBy: $model->created_by,
            updatedBy: $model->updated_by,
        );
    }
}
