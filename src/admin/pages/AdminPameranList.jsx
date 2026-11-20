import AdminEntityList from '../components/AdminEntityList';
import {
  listExhibitionsAdmin,
  setExhibitionPublishStatusAdmin,
} from '../services/adminContentStore';

const PAMERAN_SORT_OPTIONS = [
  { value: 'updated_desc', label: 'Urutkan: Terakhir diubah' },
  { value: 'date_desc', label: 'Tanggal mulai: Terbaru' },
  { value: 'date_asc', label: 'Tanggal mulai: Terlama' },
  { value: 'title_asc', label: 'Judul: A–Z' },
];

export default function AdminPameranList() {
  return (
    <AdminEntityList
      entityType="pameran"
      headingTitle="Pameran"
      addLabel="+ Tambah Pameran"
      addPath="/pameran/baru"
      publicBasePath="/pameran"
      editBasePath="/pameran"
      sortOptions={PAMERAN_SORT_OPTIONS}
      fetchList={listExhibitionsAdmin}
      onToggleArchive={setExhibitionPublishStatusAdmin}
    />
  );
}

