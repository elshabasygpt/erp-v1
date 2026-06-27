<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Customer Notification Drivers
    |--------------------------------------------------------------------------
    */

    'notification_driver' => env('NOTIFICATION_DRIVER', 'log'),

    'whatsapp' => [
        'token'    => env('WHATSAPP_TOKEN'),
        'phone_id' => env('WHATSAPP_PHONE_ID'),
    ],

    'twilio' => [
        'sid'   => env('TWILIO_SID'),
        'token' => env('TWILIO_TOKEN'),
        'from'  => env('TWILIO_FROM'),
    ],

    'vonage' => [
        'key'    => env('VONAGE_KEY'),
        'secret' => env('VONAGE_SECRET'),
        'from'   => env('VONAGE_FROM', 'ERP'),
    ],

];
