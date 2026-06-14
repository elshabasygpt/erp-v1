<?php
namespace App\Infrastructure\Eloquent\Repositories;
use App\Domain\CRM\Entities\Customer;
use App\Domain\CRM\Repositories\CustomerRepositoryInterface;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use Illuminate\Support\Facades\DB;

final class EloquentCustomerRepository implements CustomerRepositoryInterface
{
    public function findById(string $id): ?Customer { $m=CustomerModel::find($id); return $m?$this->toDomain($m):null; }
    public function create(Customer $c): Customer { CustomerModel::create(['id'=>$c->getId(),'name'=>$c->getName(),'email'=>$c->getEmail(),'phone'=>$c->getPhone(),'address'=>$c->getAddress(),'tax_number'=>$c->getTaxNumber(),'balance'=>$c->getBalance(),'is_active'=>$c->isActive()]); return $c; }
    public function update(Customer $c): Customer { CustomerModel::where('id',$c->getId())->update(['name'=>$c->getName(),'email'=>$c->getEmail(),'phone'=>$c->getPhone(),'address'=>$c->getAddress(),'tax_number'=>$c->getTaxNumber(),'balance'=>$c->getBalance(),'is_active'=>$c->isActive()]); return $c; }
    public function delete(string $id): bool { return CustomerModel::where('id',$id)->delete()>0; }
    public function paginate(int $perPage=15, array $filters=[]): array { $q=CustomerModel::query(); if(!empty($filters['search'])) $q->where('name','ilike',"%{$filters['search']}%"); return $q->orderBy('name')->paginate($perPage)->toArray(); }
    public function search(string $query, int $limit=20): array { return CustomerModel::where('is_active',true)->where(fn($q)=>$q->where('name','ilike',"%{$query}%")->orWhere('phone','ilike',"%{$query}%"))->limit($limit)->get()->toArray(); }
    public function getStatement(string $customerId, ?\DateTimeImmutable $from=null, ?\DateTimeImmutable $to=null): array {
        $q=DB::connection('tenant')->table('invoices')->where('customer_id',$customerId)->where('status','!=','cancelled');
        if($from) $q->where('invoice_date','>=',$from->format('Y-m-d'));
        if($to) $q->where('invoice_date','<=',$to->format('Y-m-d'));
        return $q->orderBy('invoice_date')->get()->toArray();
    }
    private function toDomain(CustomerModel $m): Customer { return new Customer($m->id,$m->name,$m->email,$m->phone,$m->address,$m->tax_number,(float)$m->balance,$m->is_active); }
}
