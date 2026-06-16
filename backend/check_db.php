<?php
echo \App\Infrastructure\Eloquent\Models\UserModel::count() . " users\n";
$u = \App\Infrastructure\Eloquent\Models\UserModel::first();
echo $u ? $u->email : "No users found";
echo "\n";
