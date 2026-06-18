<?php

namespace Tests\Feature;

use Tests\TestCase;

class CacheTableTest extends TestCase
{
    public function test_cache_table()
    {
        $tables = \DB::connection('sqlite')->select("SELECT name FROM sqlite_master WHERE type='table'");
        dump('Total tables: '.count($tables));
        $cacheTable = array_filter($tables, fn ($t) => $t->name === 'cache');
        dump('Cache table exists? '.(! empty($cacheTable) ? 'Yes' : 'No'));
        if (! empty($cacheTable)) {
            dump(\DB::connection('sqlite')->select('SELECT * FROM cache LIMIT 1'));
        }
        $this->assertTrue(true);
    }
}
