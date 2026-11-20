import AdminEntityList from '../components/AdminEntityList';
import { useAdminAuth } from '../context/adminContexts';
import {
  listArticlesAdmin,
  setArticlePublishStatusAdmin,
} from '../services/adminStudioStore';

const ARTIKEL_SORT_OPTIONS = [
  { value: 'updated_desc', label: 'Urutkan: Terakhir diubah' },
  { value: 'title_asc', label: 'Urutkan: Judul A–Z' },
  { value: 'date_asc', label: 'Urutkan: Terlama diterbitkan' },
];

export default function AdminArtikelList() {
  const { user } = useAdminAuth();

  return (
    <AdminEntityList
      entityType="artikel"
      headingTitle="Artikel"
      addLabel="+ Tambah Artikel"
      addPath="/artikel/baru"
      publicBasePath="/artikel"
      editBasePath="/artikel"
      sortOptions={ARTIKEL_SORT_OPTIONS}
      fetchList={listArticlesAdmin}
      onToggleArchive={(id, nextStatus) => setArticlePublishStatusAdmin(id, nextStatus, user)}
    />
  );
}

