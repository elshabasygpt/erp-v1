<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\RMA;

use App\Infrastructure\Eloquent\Models\BaseModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RmaRequestModel extends BaseModel
{
    protected $table = 'rma_requests';

    protected $fillable = [
        'tenant_id',
        'rma_number',
        'customer_id',
        'invoice_id',
        'return_type',
        'reason_category',
        'reason_details',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
        'fulfilled_at',
        'fulfilled_reference_type',
        'fulfilled_reference_id',
        'expires_at',
        'expected_refund_value',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'expected_refund_value' => 'decimal:2',
        'reviewed_at'           => 'datetime',
        'fulfilled_at'          => 'datetime',
        'expires_at'            => 'datetime',
    ];

    // ─── Reason category constants ───────────────────────────────────────────
    public const REASON_DEFECTIVE_MANUFACTURING = 'defective_manufacturing';
    public const REASON_DEFECTIVE_INSTALLATION  = 'defective_installation';
    public const REASON_WRONG_PART_ORDERED      = 'wrong_part_ordered';
    public const REASON_WRONG_PART_SHIPPED      = 'wrong_part_shipped';
    public const REASON_CUSTOMER_CHANGED_MIND   = 'customer_changed_mind';
    public const REASON_WARRANTY_CLAIM          = 'warranty_claim';
    public const REASON_CORE_DEPOSIT_RETURN     = 'core_deposit_return';
    public const REASON_SHIPPING_DAMAGE         = 'shipping_damage';
    public const REASON_OTHER                   = 'other';

    public const REASON_CATEGORIES = [
        self::REASON_DEFECTIVE_MANUFACTURING,
        self::REASON_DEFECTIVE_INSTALLATION,
        self::REASON_WRONG_PART_ORDERED,
        self::REASON_WRONG_PART_SHIPPED,
        self::REASON_CUSTOMER_CHANGED_MIND,
        self::REASON_WARRANTY_CLAIM,
        self::REASON_CORE_DEPOSIT_RETURN,
        self::REASON_SHIPPING_DAMAGE,
        self::REASON_OTHER,
    ];

    public const REASON_LABELS = [
        self::REASON_DEFECTIVE_MANUFACTURING => 'Defective — Manufacturing',
        self::REASON_DEFECTIVE_INSTALLATION  => 'Defective — Installation',
        self::REASON_WRONG_PART_ORDERED      => 'Wrong Part (Customer Error)',
        self::REASON_WRONG_PART_SHIPPED      => 'Wrong Part (Our Error)',
        self::REASON_CUSTOMER_CHANGED_MIND   => 'Customer Changed Mind',
        self::REASON_WARRANTY_CLAIM          => 'Warranty Claim',
        self::REASON_CORE_DEPOSIT_RETURN     => 'Core Deposit Return',
        self::REASON_SHIPPING_DAMAGE         => 'Shipping Damage',
        self::REASON_OTHER                   => 'Other',
    ];

    // ─── Status constants ────────────────────────────────────────────────────
    public const STATUS_SUBMITTED    = 'submitted';
    public const STATUS_UNDER_REVIEW = 'under_review';
    public const STATUS_APPROVED     = 'approved';
    public const STATUS_REJECTED     = 'rejected';
    public const STATUS_FULFILLED    = 'fulfilled';
    public const STATUS_CANCELLED    = 'cancelled';

    // ─── Relationships ───────────────────────────────────────────────────────

    public function items(): HasMany
    {
        return $this->hasMany(RmaRequestItemModel::class, 'rma_request_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(InvoiceModel::class, 'invoice_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(UserModel::class, 'created_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(UserModel::class, 'reviewed_by');
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function canBeApproved(): bool
    {
        return in_array($this->status, [self::STATUS_SUBMITTED, self::STATUS_UNDER_REVIEW], true)
            && ! $this->isExpired();
    }

    public function canBeFulfilled(): bool
    {
        return $this->status === self::STATUS_APPROVED && ! $this->isExpired();
    }

    public function canBeRejected(): bool
    {
        return in_array($this->status, [self::STATUS_SUBMITTED, self::STATUS_UNDER_REVIEW], true);
    }
}
