<?php

namespace App\Infrastructure\Eloquent\Models;

use App\Infrastructure\Eloquent\Models\CRM\CustomerInteractionModel;
use App\Infrastructure\Eloquent\Models\CRM\CustomerNoteModel;
use App\Infrastructure\Eloquent\Models\CRM\SalesFollowUpModel;

class CustomerModel extends BaseModel
{
    protected $table = 'customers';

    protected $fillable = ['name', 'email', 'phone', 'address', 'tax_number', 'balance', 'credit_limit', 'is_active', 'created_by', 'updated_by', 'loyalty_points', 'segment'];

    protected $casts = ['balance' => 'decimal:2', 'is_active' => 'boolean', 'loyalty_points' => 'integer'];

    public function invoices()
    {
        return $this->hasMany(InvoiceModel::class, 'customer_id');
    }

    public function salesReturns()
    {
        return $this->hasMany(SalesReturnModel::class, 'customer_id');
    }

    public function quotations()
    {
        return $this->hasMany(QuotationModel::class, 'customer_id');
    }

    public function vouchers()
    {
        return $this->hasMany(VoucherModel::class, 'customer_id');
    }

    public function notes()
    {
        return $this->hasMany(CustomerNoteModel::class, 'customer_id');
    }

    public function interactions()
    {
        return $this->hasMany(CustomerInteractionModel::class, 'customer_id');
    }

    public function followUps()
    {
        return $this->hasMany(SalesFollowUpModel::class, 'customer_id');
    }

    public function vehicles()
    {
        return $this->hasMany(CustomerVehicleModel::class, 'customer_id')
            ->with(['vehicleYear.vehicleModel.make', 'lastService'])
            ->where('is_active', true);
    }
}
