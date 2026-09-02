/* Keep recovered directory descriptors useful without turning long taglines
   into broken card headings. The original bios remain in the biography field. */
update public.team_members
set role = 'Programme Committee',
    affiliation = case name
      when 'Emmanuella Ben' then 'Graduate of Nutrition and Dietetics; public health background'
      when 'Sagir Tambuwal Muhammad' then 'Kaduna State University; PhD candidate, University of Trier, Germany'
      when 'Wambui Njonge' then 'Kenya Medical Research Institute (KEMRI)'
      when 'Msughaondo Check Isho' then 'Global Health and Tropical Medicine'
      when 'Uzoma Emmanuella Adebayo' then 'PT, MPH'
      when 'Prof. Ngozi Eunice Osadebe' then 'University of Nigeria, Nsukka'
      else affiliation
    end,
    updated_at = now()
where name in (
  'Emmanuella Ben', 'Sagir Tambuwal Muhammad', 'Wambui Njonge',
  'Msughaondo Check Isho', 'Uzoma Emmanuella Adebayo',
  'Prof. Ngozi Eunice Osadebe'
);

update public.team_members
set role = 'Communications Team',
    affiliation = case name
      when 'Precious Nengak' then 'Public health scientist; AMR and genomic surveillance'
      when 'Wazhi Godsave Binlak' then 'Medical laboratory scientist; infectious disease surveillance'
      when 'Dr Ify Obim' then 'University of Nigeria, Nsukka'
      when 'Chukwuagoziem Iloanusi' then 'Research associate; programme manager; emerging physician-scientist'
      when 'Godswill Imole' then 'Computational scientist and bioinformatician'
      when 'Aladejana Abdulrahman' then 'Health content writer and community manager'
      else affiliation
    end,
    updated_at = now()
where name in (
  'Precious Nengak', 'Wazhi Godsave Binlak', 'Dr Ify Obim',
  'Chukwuagoziem Iloanusi', 'Godswill Imole', 'Aladejana Abdulrahman'
);
