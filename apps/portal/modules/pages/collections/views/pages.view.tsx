import { getTranslations } from 'next-intl/server';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';

/** The place of a space that could not be read: the sidebar still works, and this says what failed. */
export const PagesView = async () => {
  const t = await getTranslations('pages');
  return (
    <main className="min-h-full">
      <div className="p-4 sm:p-6">
        <FormErrorBanner message={t('loadError')} />
      </div>
    </main>
  );
};
