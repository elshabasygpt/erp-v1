import CrossReferenceContent from '@/components/inventory/CrossReferenceContent';

interface Props {
    params: { locale: string };
}

export default function CrossReferencePage({ params }: Props) {
    return <CrossReferenceContent dict={{}} locale={params.locale} />;
}
