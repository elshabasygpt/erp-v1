<?php
namespace Tests\Unit\Domain\Treasury;

use App\Application\Treasury\UseCases\TransferBetweenSafesUseCase;
use App\Domain\Treasury\Entities\Safe;
use App\Domain\Treasury\Repositories\SafeRepositoryInterface;
use App\Domain\Treasury\Repositories\SafeTransactionRepositoryInterface;
use App\Domain\Treasury\Entities\SafeTransaction;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;

class TransferBetweenSafesUseCaseTest extends TestCase
{
    private SafeRepositoryInterface&MockObject $safeRepo;
    private SafeTransactionRepositoryInterface&MockObject $txRepo;
    private TransferBetweenSafesUseCase $useCase;

    protected function setUp(): void
    {
        $this->safeRepo = $this->createMock(SafeRepositoryInterface::class);
        $this->txRepo   = $this->createMock(SafeTransactionRepositoryInterface::class);
        $this->useCase  = new TransferBetweenSafesUseCase($this->safeRepo, $this->txRepo);
    }

    private function makeSafe(int $id, float $balance): Safe
    {
        return new Safe($id, 1, 'Safe ' . $id, $balance, 'SAR', false);
    }

    public function test_transfers_amount_between_safes_successfully(): void
    {
        $from = $this->makeSafe(1, 1000);
        $to   = $this->makeSafe(2, 500);

        $this->safeRepo->method('findById')->willReturnMap([
            [1, $from],
            [2, $to],
        ]);

        $this->safeRepo->expects($this->exactly(2))->method('updateBalance');
        $this->txRepo->expects($this->exactly(2))->method('save')
            ->willReturn($this->createMock(SafeTransaction::class));

        $this->useCase->execute(1, 2, 300);
    }

    public function test_throws_when_amount_is_zero_or_negative(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->useCase->execute(1, 2, 0);
    }

    public function test_throws_when_insufficient_balance(): void
    {
        $from = $this->makeSafe(1, 100);

        $this->safeRepo->method('findById')->willReturn($from);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Insufficient balance');

        $this->useCase->execute(1, 2, 500);
    }

    public function test_throws_when_source_safe_not_found(): void
    {
        $this->safeRepo->method('findById')->willReturn(null);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Source safe not found');

        $this->useCase->execute(99, 2, 100);
    }
}
