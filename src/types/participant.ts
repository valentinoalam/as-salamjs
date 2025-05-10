export interface Participant {
  id?: number
  name: string
  sex: string
  bod: string
  age: number
  phone: string
  alamat_ktp: string
  alamat_domisili: string
  emergency_contact:{
    name: string
    phone: string
  }
  bersama: string
  keluarga?: FamilyMember[]
  isPresent?: boolean
}

export interface FamilyMember {
  id?: number
  nama: string
  keterangan: string
  participantId?: number // Foreign key reference
}

export type ViewMode = 'table' | 'card';
export type ParticipantField = keyof Participant;
export type SortDirection = 'asc' | 'desc';
export type AgeGroup = 'all' | 'child' | 'teen' | 'adult' | 'senior';

export interface FilterState {
  visibleFields: ParticipantField[];
  searchQuery: string;
  sortField: ParticipantField;
  sortDirection: SortDirection;
  jenisKelamin: string;
  ageGroup: AgeGroup;
  addressFilter: string;
}