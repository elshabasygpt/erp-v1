<?php
namespace App\Infrastructure\Eloquent\Repositories;
use App\Domain\CRM\Entities\Supplier;
use App\Domain\CRM\Repositories\SupplierRepositoryInterface;
use App\Infrastructure\Eloquent\Models\SupplierModel;

final class EloquentSupplierRepository implements SupplierRepositoryInterface
{
    public function findById(string $id): ?Supplier { $m=SupplierModel::find($id); return $m?$this->toDomain($m):null; }
    public function create(Supplier $s): Supplier { SupplierModel::create(['id'=>$s->getId(),'name'=>$s->getName(),'email'=>$s->getEmail(),'phone'=>$s->getPhone(),'address'=>$s->getAddress(),'tax_number'=>$s->getTaxNumber(),'balance'=>$s->getBalance(),'is_active'=>$s->isActive()]); return $s; }
    public function update(Supplier $s): Supplier { SupplierModel::where('id',$s->getId())->update(['name'=>$s->getName(),'email'=>$s->getEmail(),'phone'=>$s->getPhone(),'address'=>$s->getAddress(),'tax_number'=>$s->getTaxNumber()]); return $s; }
    public function delete(string $id): bool { return SupplierModel::where('id',$id)->delete()>0; }
    public function paginate(int $perPage=15, array $filters=[]): array { $q=SupplierModel::query(); if(!empty($filters['search'])) $q->where('name','ilike',"%{$filters['search']}%"); return $q->orderBy('name')->paginate($perPage)->toArray(); }
    public function search(string $query, int $limit=20): array { return SupplierModel::where('is_active',true)->where(fn($q)=>$q->where('name','ilike',"%{$query}%"))->limit($limit)->get()->toArray(); }
    private function toDomain(SupplierModel $m): Supplier { return new Supplier($m->id,$m->name,$m->email,$m->phone,$m->address,$m->tax_number,(float)$m->balance,$m->is_active); }
}
