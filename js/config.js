/* חיבור לענן (Supabase, פרויקט "My life").
   המפתח כאן הוא מפתח ציבורי שמיועד לדפדפן: הוא לא נותן גישה לשום נתון בלי התחברות,
   כי הטבלה והקבצים מוגנים כך שכל משתמש רואה רק את שלו. */
const CONFIG = {
  supabaseUrl: 'https://asauomgvxmzfgpauragb.supabase.co',
  supabaseKey: 'sb_publishable_3cL4fjscOB66U3LovpjDoA_b9IpOrZG',
  defaultEmail: 'elazar91@gmail.com',
  table: 'coach_items',
  bucket: 'coach-files',
};
