import { getDictionary, type Locale } from '@/i18n/config';
import TasksContent from '@/components/tasks/TasksContent';

export default async function TasksPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);
    return <TasksContent dict={dict} locale={params.locale} />;
}
