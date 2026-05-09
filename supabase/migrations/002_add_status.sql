alter table training_sessions
  add column if not exists status text not null default 'probehlo'
  constraint training_status_check check (status in ('probehlo', 'zruseno', 'prelozeno'));
