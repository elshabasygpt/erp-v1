<?php
namespace App\Infrastructure\Eloquent\Repositories;
use App\Domain\Purchases\Entities\PurchaseInvoice;
use App\Domain\Purchases\Repositories\PurchaseRepositoryInterface;
use App\Infrastructure\Eloquent\Models\PurchaseInvoiceModel;

final class EloquentPurchaseRepository implements PurchaseRepositoryInterface
{
    public function findById(string $id): ?PurchaseInvoice { $m=PurchaseInvoiceModel::with('items')->find($id); return $m?$this->toDomain($m):null; }
    public function create(PurchaseInvoice $i): PurchaseInvoice { PurchaseInvoiceModel::create(['id'=>$i->getId(),'invoice_number'=>$i->getInvoiceNumber(),'supplier_id'=>$i->getSupplierId(),'subtotal'=>$i->getSubtotal(),'vat_amount'=>$i->getVatAmount(),'total'=>$i->getTotal(),'status'=>$i->getStatus(),'notes'=>$i->getNotes(),'warehouse_id'=>$i->getWarehouseId(),'invoice_date'=>$i->getInvoiceDate()]); return $i; }
    public function update(PurchaseInvoice $i): PurchaseInvoice { PurchaseInvoiceModel::where('id',$i->getId())->update(['status'=>$i->getStatus(),'notes'=>$i->getNotes()]); return $i; }
    public function delete(string $id): bool { return PurchaseInvoiceModel::where('id',$id)->delete()>0; }
    public function getNextInvoiceNumber(): string { $last=PurchaseInvoiceModel::orderBy('created_at','desc')->first(); $n=$last?((int)substr($last->invoice_number,3))+1:1; return 'PO-'.str_pad((string)$n,6,'0',STR_PAD_LEFT); }
    public function paginate(int $perPage=15, array $filters=[]): array { $q=PurchaseInvoiceModel::with('supplier','items'); if(!empty($filters['status'])) $q->where('status',$filters['status']); return $q->orderBy('created_at','desc')->paginate($perPage)->toArray(); }
    public function getBySupplier(string $supplierId, int $perPage=15): array { return PurchaseInvoiceModel::where('supplier_id',$supplierId)->orderBy('created_at','desc')->paginate($perPage)->toArray(); }
    private function toDomain(PurchaseInvoiceModel $m): PurchaseInvoice { return new PurchaseInvoice($m->id,$m->invoice_number,$m->supplier_id,(float)$m->subtotal,(float)$m->vat_amount,(float)$m->total,$m->status,$m->notes,$m->warehouse_id,null,null,new \DateTimeImmutable($m->invoice_date)); }
}
