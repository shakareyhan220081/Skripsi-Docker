// src/app/Admin/rag-detail-view.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  Loader2,
  CornerDownLeft,
  Wand2,
} from 'lucide-react';
import CreatableSelect from 'react-select/creatable';
import { toast } from 'sonner';

// --- INTERFACES ---
interface RagDetailViewProps {
  onBack: () => void;
  onSuccess: () => void;
}

interface CategoryOption {
  label: string;
  value: string;
}

// Interface untuk menghindari error ESLint 'any' pada event react-select
interface SelectOption {
  label: string;
  value: string;
}

export default function RagDetailView({
  onBack,
  onSuccess,
}: RagDetailViewProps) {
  // State Input
  const [file, setFile] = useState<File | null>(null);
  const [topic, setTopic] = useState('');

  // State Kategori
  const [category, setCategory] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // State Proses Upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. FETCH KATEGORI
  useEffect(() => {
    setIsLoadingCategories(true);
    fetch('http://localhost:5000/api/knowledge/categories')
      .then((res) => res.json())
      .then((json) => {
        if (!json.error && json.data) {
          const options = json.data.map((cat: { name: string }) => ({
            label: cat.name,
            value: cat.name,
          }));
          setCategoryOptions(options);
        }
      })
      .catch((err) => console.error('Gagal load kategori:', err))
      .finally(() => setIsLoadingCategories(false));
  }, []);

  // 2. HANDLER PILIH FILE
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];

      if (selected.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file terlalu besar (Maks 10MB)');
        return;
      }

      if (
        selected.type === 'application/pdf' ||
        selected.type === 'text/plain'
      ) {
        setFile(selected);
        if (!topic) {
          const name = selected.name
            .replace(/\.[^/.]+$/, '')
            .replace(/_/g, ' ');
          setTopic(name);
        }
      } else {
        toast.error('Format file harus PDF atau TXT');
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 3. HANDLER UPLOAD
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !topic || !category) {
      toast.warning('Mohon lengkapi Topik, Kategori, dan File.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('topic', topic);
      formData.append('category', category);

      setUploadStep('AI sedang membaca & merapikan format PDF...');

      const response = await fetch(
        'http://localhost:8080/api/upload-knowledge',
        {
          method: 'POST',
          body: formData,
        },
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(
          errData.detail || 'Gagal memproses dokumen di server AI.',
        );
      }

      setUploadStep('Selesai! Menyimpan data...');
      await new Promise((r) => setTimeout(r, 800));

      toast.success('Dokumen Berhasil Diproses!', {
        description:
          'Teks PDF telah dirapikan menjadi format tabel/list dan disimpan ke Knowledge Base.',
      });

      setFile(null);
      setTopic('');
      setCategory('');
      onSuccess();
    } catch (error) {
      console.error('Upload Error:', error);
      toast.error('Gagal Memproses Dokumen', {
        description:
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan server AI (Port 8080).',
      });
    } finally {
      setIsUploading(false);
      setUploadStep('');
    }
  };

  // --- RENDER UI ---
  return (
    <div className='p-4 sm:p-6 lg:p-8 h-full flex flex-col animate-in fade-in duration-300 overflow-y-auto'>
      <div className='max-w-4xl mx-auto w-full'>
        {/* Header dengan style Glassmorphism */}
        <div className='mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/40 backdrop-blur-md p-4 rounded-xl border border-white/50 shadow-sm gap-4'>
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold text-[#13484f] tracking-tight flex items-center gap-2'>
              <UploadCloud className='w-7 h-7 sm:w-8 sm:h-8 text-primary' />
              Upload Dokumen Cerdas
            </h1>
            <p className='text-gray-600 mt-1 font-medium opacity-80 text-xs sm:text-sm'>
              Upload PDF (Jadwal, Biaya, SK), AI akan otomatis membaca dan
              memperbaiki tabel yang berantakan.
            </p>
          </div>
          <button
            onClick={onBack}
            disabled={isUploading}
            className='flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold text-[#13484f] 
                       glass-card hover:bg-white/40 border-white/50 shadow-sm transition-all active:scale-95 disabled:opacity-50 w-full sm:w-auto justify-center'
          >
            <CornerDownLeft className='w-4 h-4' />
            Batal
          </button>
        </div>

        {/* Card Form Utama (Glass Card) */}
        <div className='glass-card p-6 sm:p-10 relative overflow-hidden shadow-xl'>
          {/* Background Decor */}
          <div className='absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none'></div>

          <form onSubmit={handleUpload} className='space-y-8 relative z-10'>
            {/* 1. Input Topik & Kategori */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8'>
              {/* Judul */}
              <div className='group'>
                <label className='block text-sm font-bold text-[#13484f] mb-2 pl-1'>
                  Judul / Topik Dokumen
                </label>
                <input
                  type='text'
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder='Contoh: Jadwal UAS Semester Genap 2025'
                  className='w-full px-4 py-3 rounded-xl 
                             bg-white/60 border border-white/50 
                             text-gray-700 placeholder:text-gray-400
                             focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/80
                             outline-none transition-all duration-200 shadow-sm backdrop-blur-sm text-sm'
                  required
                  disabled={isUploading}
                />
              </div>

              {/* Kategori (Dropdown Creatable) */}
              <div>
                <label className='block text-sm font-bold text-[#13484f] mb-2 pl-1'>
                  Kategori
                </label>
                <CreatableSelect<SelectOption>
                  isClearable
                  isDisabled={isUploading || isLoadingCategories}
                  isLoading={isLoadingCategories}
                  onChange={(newValue) =>
                    setCategory(newValue ? newValue.value : '')
                  }
                  onCreateOption={(inputValue) => {
                    setCategory(inputValue);
                    setCategoryOptions((prev) => [
                      ...prev,
                      { label: inputValue, value: inputValue },
                    ]);
                  }}
                  options={categoryOptions}
                  value={category ? { label: category, value: category } : null}
                  placeholder='Pilih atau Ketik Baru...'
                  classNames={{
                    control: (state) =>
                      `!bg-white/60 !backdrop-blur-sm !border-white/50 !rounded-xl !shadow-none !py-1 ${
                        state.isFocused
                          ? '!ring-2 !ring-primary/50 !border-primary/50'
                          : ''
                      }`,
                    menu: () =>
                      '!bg-white/90 !backdrop-blur-md !border !border-white/40 !rounded-xl !mt-2 !shadow-xl !overflow-hidden z-50',
                    option: (state) =>
                      `!cursor-pointer !text-sm !py-2.5 !px-4 ${
                        state.isFocused
                          ? '!bg-primary/10 !text-primary'
                          : '!bg-transparent !text-gray-700 hover:!bg-white/40'
                      }`,
                    singleValue: () => '!text-gray-800 !text-sm !font-medium',
                    input: () => '!text-gray-800 !text-sm',
                    placeholder: () => '!text-gray-400 !text-sm',
                  }}
                />
              </div>
            </div>

            {/* 2. Drag & Drop Area */}
            <div>
              <label className='block text-sm font-bold text-[#13484f] mb-2 pl-1'>
                File Dokumen (PDF/TXT)
              </label>
              <div
                className={`border-2 border-dashed rounded-2xl p-6 md:p-10 text-center transition-all cursor-pointer relative group
                  ${
                    file
                      ? 'border-primary bg-primary/5 shadow-inner'
                      : 'border-white/60 bg-white/30 hover:border-primary/50 hover:bg-white/50 shadow-sm'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='.pdf,.txt'
                  onChange={handleFileChange}
                  className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10'
                  disabled={isUploading}
                />

                {!file ? (
                  <div className='flex flex-col items-center gap-4'>
                    <div className='p-4 md:p-5 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform shadow-sm border border-primary/20'>
                      <UploadCloud className='w-8 h-8 md:w-10 md:h-10' />
                    </div>
                    <div>
                      <p className='font-bold text-[#13484f] text-base md:text-lg'>
                        Klik atau Tarik File PDF ke sini
                      </p>
                      <p className='text-[10px] md:text-xs text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed'>
                        Maksimal 10MB. Disarankan PDF berbasis teks untuk hasil
                        pemrosesan AI yang maksimal.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className='flex items-center justify-between bg-white/80 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-md border border-primary/30 relative z-20 animate-in zoom-in-95 duration-200'>
                    <div className='flex items-center gap-3 md:gap-4'>
                      <div className='p-2 md:p-3 bg-red-100 text-red-600 rounded-xl shadow-inner'>
                        <FileText className='w-6 h-6 md:w-8 md:h-8' />
                      </div>
                      <div className='text-left'>
                        <p className='font-bold text-gray-800 truncate max-w-[180px] md:max-w-[250px] text-xs md:text-sm'>
                          {file.name}
                        </p>
                        <p className='text-[10px] md:text-xs text-gray-500 mt-0.5'>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type='button'
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFile();
                      }}
                      disabled={isUploading}
                      className='p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all active:scale-90'
                    >
                      <X className='w-5 h-5 md:w-6 md:h-6' />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Info AI Box (Style Amber Glass) */}
            <div className='bg-amber-50/40 backdrop-blur-sm border border-amber-200 rounded-2xl p-4 md:p-5 flex gap-3 md:gap-4 shadow-sm'>
              <div className='p-2 bg-amber-100 rounded-lg h-fit'>
                <Wand2 className='w-4 h-4 md:w-5 md:h-5 text-amber-600 shrink-0' />
              </div>
              <div className='text-xs md:text-sm text-amber-900 leading-relaxed font-medium'>
                <strong className='text-amber-700 block mb-1'>
                  Fitur AI Auto-Format:
                </strong>
                Sistem otomatis membaca PDF Anda. Jika terdapat tabel jadwal
                atau daftar poin yang berantakan, AI akan menyusunnya kembali
                menjadi format yang rapi dan terstruktur.
              </div>
            </div>

            {/* 4. Submit Button */}
            <div className='pt-2 md:pt-4'>
              <button
                type='submit'
                disabled={isUploading || !file}
                className={`w-full py-3.5 md:py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-[0.98] text-sm md:text-base
                  ${
                    isUploading || !file
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none border border-slate-300'
                      : 'bg-[linear-gradient(to_right,var(--primary),var(--accent))] text-white shadow-lg hover:brightness-110'
                  }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className='w-5 h-5 md:w-6 md:h-6 animate-spin' />
                    <span className='animate-pulse'>{uploadStep}</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className='w-5 h-5 md:w-6 md:h-6' />
                    <span>Upload & Proses dengan AI</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
