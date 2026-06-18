<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VehicleDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding Vehicle Data...');

        // Fetch the first tenant to attach data to
        $tenantId = DB::table('tenants')->value('id');

        if (! $tenantId) {
            $this->command->warn('No tenant found. Cannot seed vehicle data.');

            return;
        }

        // Clear existing data to prevent duplicates on re-seed
        DB::table('product_vehicle_compatibility')->delete();
        DB::table('vehicle_years')->delete();
        DB::table('vehicle_models')->delete();
        DB::table('vehicle_makes')->delete();

        $makes = [
            'Toyota' => [
                'name_ar' => 'تويوتا',
                'models' => [
                    'Camry' => ['name_ar' => 'كامري', 'years' => ['2018-2024']],
                    'Corolla' => ['name_ar' => 'كورولا', 'years' => ['2019-2024', '2014-2018']],
                    'Land Cruiser' => ['name_ar' => 'لاند كروزر', 'years' => ['2022-2024', '2016-2021']],
                ],
            ],
            'Hyundai' => [
                'name_ar' => 'هيونداي',
                'models' => [
                    'Elantra' => ['name_ar' => 'إلنترا', 'years' => ['2021-2024']],
                    'Sonata' => ['name_ar' => 'سوناتا', 'years' => ['2020-2024']],
                    'Tucson' => ['name_ar' => 'توسان', 'years' => ['2022-2024']],
                ],
            ],
            'Kia' => [
                'name_ar' => 'كيا',
                'models' => [
                    'Optima' => ['name_ar' => 'أوبتيما', 'years' => ['2016-2020']],
                    'Sportage' => ['name_ar' => 'سبورتاج', 'years' => ['2022-2024']],
                    'Cerato' => ['name_ar' => 'سيراتو', 'years' => ['2019-2024']],
                ],
            ],
            'Nissan' => [
                'name_ar' => 'نيسان',
                'models' => [
                    'Altima' => ['name_ar' => 'ألتيما', 'years' => ['2019-2024']],
                    'Patrol' => ['name_ar' => 'باترول', 'years' => ['2020-2024', '2010-2019']],
                    'Sunny' => ['name_ar' => 'صني', 'years' => ['2020-2024']],
                ],
            ],
            'Honda' => [
                'name_ar' => 'هوندا',
                'models' => [
                    'Accord' => ['name_ar' => 'أكورد', 'years' => ['2018-2022', '2023-2024']],
                    'Civic' => ['name_ar' => 'سيفيك', 'years' => ['2022-2024']],
                    'CR-V' => ['name_ar' => 'سي آر في', 'years' => ['2023-2024']],
                ],
            ],
            'Chevrolet' => [
                'name_ar' => 'شيفروليه',
                'models' => [
                    'Tahoe' => ['name_ar' => 'تاهو', 'years' => ['2021-2024', '2015-2020']],
                    'Caprice' => ['name_ar' => 'كابريس', 'years' => ['2007-2017']],
                    'Malibu' => ['name_ar' => 'ماليبو', 'years' => ['2016-2022']],
                ],
            ],
            'Mitsubishi' => [
                'name_ar' => 'ميتسوبيشي',
                'models' => [
                    'Pajero' => ['name_ar' => 'باجيرو', 'years' => ['2015-2024']],
                    'Lancer' => ['name_ar' => 'لانسر', 'years' => ['2008-2017']],
                    'Outlander' => ['name_ar' => 'أوتلاندر', 'years' => ['2022-2024']],
                ],
            ],
            'Volkswagen' => [
                'name_ar' => 'فولكس فاجن',
                'models' => [
                    'Golf' => ['name_ar' => 'جولف', 'years' => ['2020-2024', '2013-2019']],
                    'Passat' => ['name_ar' => 'باسات', 'years' => ['2020-2022']],
                    'Tiguan' => ['name_ar' => 'تيجوان', 'years' => ['2017-2024']],
                ],
            ],
            'BMW' => [
                'name_ar' => 'بي ام دبليو',
                'models' => [
                    '3 Series' => ['name_ar' => 'الفئة الثالثة', 'years' => ['2019-2024']],
                    '5 Series' => ['name_ar' => 'الفئة الخامسة', 'years' => ['2017-2023']],
                    'X5' => ['name_ar' => 'اكس 5', 'years' => ['2019-2024']],
                ],
            ],
            'Mercedes' => [
                'name_ar' => 'مرسيدس',
                'models' => [
                    'C-Class' => ['name_ar' => 'الفئة سي', 'years' => ['2022-2024', '2015-2021']],
                    'E-Class' => ['name_ar' => 'الفئة إي', 'years' => ['2017-2023']],
                    'S-Class' => ['name_ar' => 'الفئة إس', 'years' => ['2021-2024']],
                ],
            ],
        ];

        DB::transaction(function () use ($makes, $tenantId) {
            foreach ($makes as $makeName => $makeData) {
                $makeId = Str::uuid()->toString();
                DB::table('vehicle_makes')->insert([
                    'id' => $makeId,
                    'tenant_id' => $tenantId,
                    'name' => $makeName,
                    'name_ar' => $makeData['name_ar'],
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                foreach ($makeData['models'] as $modelName => $modelData) {
                    $modelId = Str::uuid()->toString();
                    DB::table('vehicle_models')->insert([
                        'id' => $modelId,
                        'tenant_id' => $tenantId,
                        'make_id' => $makeId,
                        'name' => $modelName,
                        'name_ar' => $modelData['name_ar'],
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    foreach ($modelData['years'] as $yearRange) {
                        $parts = explode('-', $yearRange);
                        $yearFrom = (int) $parts[0];
                        $yearTo = isset($parts[1]) ? (int) $parts[1] : null;

                        DB::table('vehicle_years')->insert([
                            'id' => Str::uuid()->toString(),
                            'tenant_id' => $tenantId,
                            'model_id' => $modelId,
                            'year_from' => $yearFrom,
                            'year_to' => $yearTo,
                            'is_active' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        });

        $this->command->info('Vehicle data seeded successfully for tenant: '.$tenantId);
    }
}
