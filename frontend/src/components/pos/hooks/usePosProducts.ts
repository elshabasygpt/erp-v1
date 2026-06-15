import { useMemo } from 'react';

export function usePosProducts(products: any[], category: string, search: string) {
    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const matchCat = category === 'all' || p.category === category;
            const q = search.toLowerCase();
            const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.nameAr?.includes(q) || p.code?.toLowerCase().includes(q) || p.barcode?.includes(q);
            return matchCat && matchSearch;
        });
    }, [category, search, products]);

    return { filteredProducts };
}