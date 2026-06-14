<?php

namespace App\Infrastructure\Eloquent\Repositories;

use App\Domain\Accounting\Entities\Account;
use App\Domain\Accounting\Repositories\AccountRepositoryInterface;
use App\Infrastructure\Eloquent\Models\AccountModel;

final class EloquentAccountRepository implements AccountRepositoryInterface
{
    public function findById(string $id): ?Account { $m = AccountModel::find($id); return $m ? $this->toDomain($m) : null; }
    public function findByCode(string $code): ?Account { $m = AccountModel::where('code', $code)->first(); return $m ? $this->toDomain($m) : null; }
    public function create(Account $a): Account { AccountModel::create(['id'=>$a->getId(),'code'=>$a->getCode(),'name'=>$a->getName(),'name_ar'=>$a->getNameAr(),'type'=>$a->getType(),'parent_id'=>$a->getParentId(),'is_active'=>$a->isActive(),'description'=>$a->getDescription(),'level'=>$a->getLevel()]); return $a; }
    public function update(Account $a): Account { AccountModel::where('id',$a->getId())->update(['name'=>$a->getName(),'name_ar'=>$a->getNameAr(),'is_active'=>$a->isActive(),'description'=>$a->getDescription()]); return $a; }
    public function delete(string $id): bool { return AccountModel::where('id',$id)->delete() > 0; }
    public function getAll(): array { return AccountModel::orderBy('code')->get()->map(fn($m)=>$this->toDomain($m)->toArray())->toArray(); }
    public function getTree(): array { return AccountModel::with('children')->whereNull('parent_id')->orderBy('code')->get()->toArray(); }
    public function getByType(string $type): array { return AccountModel::where('type',$type)->orderBy('code')->get()->toArray(); }
    private function toDomain(AccountModel $m): Account { return new Account($m->id,$m->code,$m->name,$m->name_ar,$m->type,$m->parent_id,$m->is_active,$m->description,$m->level); }
}
