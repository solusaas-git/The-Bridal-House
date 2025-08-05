# Translation System Documentation

## Overview

The application now supports internationalization (i18n) with English and French languages. The system uses `react-i18next` and saves user language preferences in the database.

## Features

- **Language Switcher**: Located in the top bar next to the logout button
- **Persistent Preferences**: Language choice is saved to user preferences in the database
- **Real-time Switching**: Language changes apply immediately without page refresh
- **Fallback Support**: Defaults to English if no preference is found

## File Structure

```
nextjs-app/
├── public/locales/
│   ├── en/common.json          # English translations
│   └── fr/common.json          # French translations
├── src/
│   ├── components/
│   │   └── LanguageSwitcher.tsx # Language switcher component
│   ├── hooks/
│   │   └── useLanguage.ts       # Translation hook
│   ├── lib/
│   │   └── i18n.ts             # i18n configuration
│   ├── store/reducers/
│   │   └── languageSlice.ts    # Redux state for language
│   └── app/api/user-preferences/language/
│       └── route.ts            # API for saving language preference
```

## Usage

### Basic Translation

```tsx
import { useLanguage } from '@/hooks/useLanguage';

function MyComponent() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t('navigation.dashboard')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### Available Translation Keys

Common keys available in `common.json`:

```
navigation.*    - Navigation menu items
common.*       - Common UI elements (save, cancel, etc.)
auth.*         - Authentication related texts
customers.*    - Customer module texts
reservations.* - Reservations module texts
payments.*     - Payments module texts
products.*     - Products module texts
approvals.*    - Approvals module texts
language.*     - Language switcher texts
```

### Adding New Translations

1. Add the key-value pair to both `en/common.json` and `fr/common.json`
2. Use the `useLanguage` hook in your component
3. Call `t('your.key')` to get the translated text

Example:
```json
// en/common.json
{
  "buttons": {
    "submit": "Submit",
    "cancel": "Cancel"
  }
}

// fr/common.json
{
  "buttons": {
    "submit": "Soumettre",
    "cancel": "Annuler"
  }
}
```

```tsx
// In your component
const { t } = useLanguage();
<button>{t('buttons.submit')}</button>
```

## Language Switching

The language switcher is automatically available in the top bar. Users can:

1. Click the globe icon in the top bar
2. Select between English and French
3. The selection is immediately applied and saved to their user preferences
4. The preference persists across sessions

## Database Schema

The language preference is stored in the `userPreferences` collection:

```typescript
interface IUserPreferences {
  userId: ObjectId;
  language: string; // 'en' | 'fr'
  columnPreferences: object;
  // ... other fields
}
```

## Components Updated

The following components have been updated with translation support:

- **Navbar**: Navigation menu items
- **TopBar**: Logout button and language switcher
- **Layout**: Loading text and impersonation banner
- **LanguageSwitcher**: Complete translation support

## API Endpoints

### GET /api/user-preferences/language
Returns the user's saved language preference.

### PUT /api/user-preferences/language
Saves the user's language preference.

Request body:
```json
{
  "language": "en" | "fr"
}
```

## Next Steps

To extend translation support:

1. **Add more translation keys** to the JSON files
2. **Update existing components** to use the `useLanguage` hook
3. **Add new language files** (e.g., `es/common.json` for Spanish)
4. **Update the enum** in the user preferences model to include new languages
5. **Update the LanguageSwitcher** component to include new language options

## Examples in Practice

The system is already implemented in key components:

- Navigation menu items are translated
- Authentication-related texts use translations
- Common UI elements support both languages
- Language switcher provides instant feedback

Test the system by:
1. Logging into the application
2. Clicking the globe icon in the top bar
3. Switching between English and French
4. Refreshing the page to see persistence working