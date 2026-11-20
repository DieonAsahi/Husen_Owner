import AdminEntityList from '../components/AdminEntityList';
import {
  listArtworksAdmin,
  setArtworkPublishStatusAdmin,
} from '../services/adminContentStore';

const KARYA_SORT_OPTIONS = [
  { value: 'updated_desc', label: 'Urutkan: Terakhir diubah' },
  { value: 'year_desc', label: 'Tahun: Terbaru' },
  { value: 'year_asc', label: 'Tahun: Terlama' },
  { value: 'title_asc', label: 'Judul: A–Z' },
];

export default function AdminKaryaList() {
  return (
    <AdminEntityList
      entityType="karya"
      headingTitle="Karya"
      addLabel="+ Tambah Karya"
      addPath="/karya/baru"
      publicBasePath="/karya"
      editBasePath="/karya"
      sortOptions={KARYA_SORT_OPTIONS}
      fetchList={listArtworksAdmin}
      onToggleArchive={setArtworkPublishStatusAdmin}
    />
  );
}

