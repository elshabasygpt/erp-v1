<?php

use App\Infrastructure\Eloquent\Models\UserModel;

echo UserModel::count()." users\n";
$u = UserModel::first();
echo $u ? $u->email : 'No users found';
echo "\n";
