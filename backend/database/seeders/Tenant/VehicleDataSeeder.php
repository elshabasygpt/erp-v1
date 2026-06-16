<?php

namespace Database\Seeders\Tenant;

use Illuminate\Database\Seeder;
use App\Infrastructure\Eloquent\Models\VehicleMakeModel;
use App\Infrastructure\Eloquent\Models\VehicleModelModel;
use App\Infrastructure\Eloquent\Models\VehicleYearModel;

class VehicleDataSeeder extends Seeder
{
    public function run()
    {
        $makes = [
            [
                'name' => 'Toyota',
                'name_ar' => 'تويوتا',
                'models' => [
                    [
                        'name' => 'Camry',
                        'name_ar' => 'كامري',
                        'years' => [
                            ['year_from' => 2018, 'year_to' => 2024, 'engine_size' => '2.5'],
                            ['year_from' => 2012, 'year_to' => 2017, 'engine_size' => '2.5'],
                        ]
                    ],
                    [
                        'name' => 'Corolla',
                        'name_ar' => 'كورولا',
                        'years' => [
                            ['year_from' => 2020, 'year_to' => 2024, 'engine_size' => '2.0'],
                            ['year_from' => 2014, 'year_to' => 2019, 'engine_size' => '1.6'],
                        ]
                    ]
                ]
            ],
            [
                'name' => 'Hyundai',
                'name_ar' => 'هيونداي',
                'models' => [
                    [
                        'name' => 'Elantra',
                        'name_ar' => 'إلنترا',
                        'years' => [
                            ['year_from' => 2021, 'year_to' => 2024, 'engine_size' => '2.0'],
                            ['year_from' => 2016, 'year_to' => 2020, 'engine_size' => '2.0'],
                        ]
                    ],
                    [
                        'name' => 'Sonata',
                        'name_ar' => 'سوناتا',
                        'years' => [
                            ['year_from' => 2020, 'year_to' => 2024, 'engine_size' => '2.5'],
                        ]
                    ]
                ]
            ],
            [
                'name' => 'Nissan',
                'name_ar' => 'نيسان',
                'models' => [
                    [
                        'name' => 'Altima',
                        'name_ar' => 'ألتيما',
                        'years' => [
                            ['year_from' => 2019, 'year_to' => 2024, 'engine_size' => '2.5'],
                        ]
                    ],
                    [
                        'name' => 'Sunny',
                        'name_ar' => 'صني',
                        'years' => [
                            ['year_from' => 2020, 'year_to' => 2024, 'engine_size' => '1.6'],
                        ]
                    ]
                ]
            ]
        ];

        foreach ($makes as $makeData) {
            $make = VehicleMakeModel::create([
                'name' => $makeData['name'],
                'name_ar' => $makeData['name_ar'],
            ]);

            foreach ($makeData['models'] as $modelData) {
                $model = VehicleModelModel::create([
                    'make_id' => $make->id,
                    'name' => $modelData['name'],
                    'name_ar' => $modelData['name_ar'],
                ]);

                foreach ($modelData['years'] as $yearData) {
                    VehicleYearModel::create([
                        'model_id' => $model->id,
                        'year_from' => $yearData['year_from'],
                        'year_to' => $yearData['year_to'],
                        'engine_size' => $yearData['engine_size'],
                    ]);
                }
            }
        }
    }
}
