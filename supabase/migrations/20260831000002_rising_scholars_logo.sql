-- Replace the legacy AuthorAID image with Rising Scholars' current official logo.
-- Keep the existing partner URL unchanged.
update partners
set logo_url = 'https://risingscholars.net/static/img/rs_logo_horizontal_trim.png'
where name = 'Rising Scholars';
