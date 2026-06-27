import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { inventoryApi } from '@/lib/api';
import ManageBrandsModal from './ManageBrandsModal';

interface Brand {
    id: string;
    name: string;
    name_ar?: string;
    image_url?: string;
}

interface BrandSelectProps {
    value: string; // brand id
    onChange: (id: string, name: string) => void;
    isRTL: boolean;
}

export default function BrandSelect({ value, onChange, isRTL }: BrandSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [brands, setBrands] = useState<Brand[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const res = await inventoryApi.getBrands();
                if (res.data?.data) {
                    setBrands(res.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch brands", error);
            }
        };
        fetchBrands();
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredBrands =
        query === ''
            ? brands
            : brands.filter((brand) => {
                  const q = query.toLowerCase();
                  return brand.name.toLowerCase().includes(q) || (brand.name_ar && brand.name_ar.toLowerCase().includes(q));
              });

    const selectedBrand = brands.find(b => b.id === value) || null;

    const handleBrandCreated = (newBrand: Brand) => {
        setBrands(prev => [...prev, newBrand]);
        onChange(newBrand.id, newBrand.name);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div 
                className="relative w-full cursor-pointer rounded-lg bg-white dark:bg-slate-800 text-left border border-gray-300 dark:border-slate-600 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 flex items-center"
                onClick={() => setIsOpen(true)}
            >
                {selectedBrand?.image_url && (
                    <img src={selectedBrand.image_url} alt="" className="ml-2 h-6 w-6 object-contain" />
                )}
                <input
                    type="text"
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 dark:text-white bg-transparent focus:ring-0 cursor-pointer"
                    value={isOpen ? query : (selectedBrand?.name || '')}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={isRTL ? "اختر ماركة..." : "Select a brand..."}
                />
                <button 
                    type="button" 
                    className="absolute inset-y-0 right-0 flex items-center pr-2"
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                >
                    <ChevronDown
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                    />
                </button>
            </div>

            {isOpen && (
                <ul className="absolute z-[70] mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                    {filteredBrands.length === 0 && query !== '' ? (
                        <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300">
                            {isRTL ? "لم يتم العثور على ماركات" : "Nothing found."}
                        </div>
                    ) : (
                        filteredBrands.map((brand) => {
                            const selected = brand.id === value;
                            return (
                                <li
                                    key={brand.id}
                                    className={`relative cursor-pointer select-none py-2 pl-10 pr-4 hover:bg-primary-600 hover:text-white text-gray-900 dark:text-white`}
                                    onClick={() => {
                                        onChange(brand.id, brand.name);
                                        setQuery('');
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        {brand.image_url ? (
                                            <img src={brand.image_url} alt="" className="h-6 w-6 object-contain bg-white rounded p-0.5" />
                                        ) : (
                                            <div className="h-6 w-6 bg-gray-100 dark:bg-slate-700 rounded flex items-center justify-center text-xs text-gray-500">
                                                {brand.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                            {brand.name}
                                        </span>
                                    </div>
                                    {selected && (
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                                            <Check className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                    )}
                                </li>
                            );
                        })
                    )}
                    
                    <div className="border-t border-gray-100 dark:border-slate-700 mt-1">
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsOpen(false);
                                setIsAddModalOpen(true);
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            {isRTL ? 'إضافة ماركة جديدة' : 'Add New Brand'}
                        </button>
                    </div>
                </ul>
            )}

            <ManageBrandsModal 
                isOpen={isAddModalOpen} 
                onClose={() => {
                    setIsAddModalOpen(false);
                    // refresh brands list when closing modal to get updates/deletes
                    inventoryApi.getBrands().then(res => {
                        if (res.data?.data) setBrands(res.data.data);
                    });
                }} 
                onSuccess={handleBrandCreated} 
            />
        </div>
    );
}
