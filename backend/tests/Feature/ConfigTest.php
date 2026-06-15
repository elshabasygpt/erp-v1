<?php
namespace Tests\Feature;
use Tests\TestCase;
class ConfigTest extends TestCase {
    public function test_config() {
        dump("sqlite DB: " . config('database.connections.sqlite.database'));
        $this->assertTrue(true);
    }
}
