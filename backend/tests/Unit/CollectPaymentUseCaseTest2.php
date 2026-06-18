<?php

namespace Tests\Unit;

use Tests\TestCase;

class CollectPaymentUseCaseTest2 extends TestCase
{
    public function test_pdo()
    {
        dump('SQLite Tables: ', \DB::connection('sqlite')->getSchemaBuilder()->getTables());
        dump('Tenant Tables: ', \DB::connection('tenant')->getSchemaBuilder()->getTables());
        $this->assertTrue(true);
    }
}
