<?php
namespace App\Infrastructure\Eloquent\Repositories;
use App\Domain\Subscription\Entities\Plan;
use App\Domain\Subscription\Repositories\PlanRepositoryInterface;
use App\Infrastructure\Eloquent\Models\PlanModel;

final class EloquentPlanRepository implements PlanRepositoryInterface
{
    public function findById(string $id): ?Plan { $m=PlanModel::find($id); return $m?$this->toDomain($m):null; }
    public function findBySlug(string $slug): ?Plan { $m=PlanModel::where('slug',$slug)->first(); return $m?$this->toDomain($m):null; }
    public function getAll(): array { return PlanModel::orderBy('price')->get()->map(fn($m)=>$this->toDomain($m)->toArray())->toArray(); }
    public function getActive(): array { return PlanModel::where('is_active',true)->orderBy('price')->get()->map(fn($m)=>$this->toDomain($m)->toArray())->toArray(); }
    public function create(Plan $p): Plan { PlanModel::create(['id'=>$p->getId(),'name'=>$p->getName(),'slug'=>$p->getSlug(),'price'=>$p->getPrice(),'billing_cycle'=>$p->getBillingCycle(),'max_users'=>$p->getMaxUsers(),'max_products'=>$p->getMaxProducts(),'features'=>$p->getFeatures(),'is_active'=>$p->isActive(),'trial_days'=>$p->getTrialDays(),'description'=>$p->getDescription()]); return $p; }
    public function update(Plan $p): Plan { PlanModel::where('id',$p->getId())->update(['name'=>$p->getName(),'price'=>$p->getPrice(),'is_active'=>$p->isActive()]); return $p; }
    public function delete(string $id): bool { return PlanModel::where('id',$id)->delete()>0; }
    private function toDomain(PlanModel $m): Plan { return new Plan($m->id,$m->name,$m->slug,(float)$m->price,$m->billing_cycle,$m->max_users,$m->max_products,$m->features??[],$m->is_active,$m->trial_days,$m->description); }
}
