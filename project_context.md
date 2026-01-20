# Технический обзор проекта PromptInvoice

## Stack & Architecture

### Фреймворк и платформа
- **Фреймворк:** React Native с Expo SDK ~54.0.31
- **Язык программирования:** TypeScript 5.9.2
- **React:** 19.1.0
- **React Native:** 0.81.5
- **Архитектура:** Новая архитектура React Native включена (`newArchEnabled: true`)

### Структура папок
```
promptinvoice/
├── app/                    # Экранные компоненты (Expo Router file-based routing)
│   ├── _layout.tsx        # Корневой layout с Stack навигацией
│   ├── index.tsx          # Главный экран (список инвойсов)
│   └── create.tsx         # Экран создания/редактирования инвойса
├── components/            # Переиспользуемые UI компоненты
│   ├── ConfirmModal.tsx   # Модальное окно подтверждения действий
│   ├── DatePicker.tsx     # Кастомный календарь для выбора дат
│   ├── InvoiceCard.tsx     # Карточка инвойса в списке
│   ├── ItemRow.tsx        # Компонент строки позиции в инвойсе
│   └── Modal.tsx          # Базовое модальное окно с анимациями
├── services/              # Бизнес-логика и внешние интеграции
│   ├── aiService.ts       # Интеграция с Hugging Face AI (Meta-Llama-3-8B-Instruct)
│   └── pdfService.ts      # Генерация PDF через expo-print
├── store/                 # Управление глобальным состоянием
│   └── useInvoiceStore.ts # Zustand store для инвойсов
└── types/                 # TypeScript типы и интерфейсы
    └── invoice.ts         # Типы Invoice, InvoiceItem, CreateInvoiceInput
```

### Архитектурный паттерн
- **State Management:** Zustand (легковесная библиотека для управления состоянием)
- **Routing:** Expo Router (file-based routing, аналогично Next.js)
- **Data Persistence:** AsyncStorage для локального хранения
- **Component Architecture:** Функциональные компоненты с хуками React
- **Service Layer:** Разделение бизнес-логики в отдельные сервисы (AI, PDF)

### Основные библиотеки
- **Навигация:** expo-router, @react-navigation/native, @react-navigation/bottom-tabs
- **UI:** @expo/vector-icons, @react-native-community/slider
- **Хранение:** @react-native-async-storage/async-storage
- **PDF:** expo-print, expo-sharing
- **AI:** @huggingface/inference
- **Анимации:** react-native-reanimated, react-native-gesture-handler

---

## Core Functionality

### Бизнес-логика приложения
PromptInvoice — мобильное приложение для создания и управления инвойсами (счетами) с поддержкой AI-заполнения форм.

**Основные возможности:**
1. **CRUD операции с инвойсами:**
   - Создание новых инвойсов с автоматической нумерацией (INV-001, INV-002, ...)
   - Редактирование существующих инвойсов
   - Удаление инвойсов с подтверждением
   - Просмотр списка всех инвойсов с статистикой

2. **Управление данными инвойса:**
   - Информация о клиенте (имя)
   - Номер инвойса (с валидацией уникальности)
   - Даты (дата создания, срок оплаты)
   - Позиции (items) с описанием, количеством, ценой
   - Налог (tax rate) и скидка (discount) в процентах
   - Заметки (notes)

3. **Автоматические расчеты:**
   - Подсчет подытога (subtotal) для каждой позиции
   - Расчет налога от подытога
   - Расчет скидки от подытога
   - Итоговая сумма (total = subtotal + tax - discount)

4. **AI-интеграция:**
   - Заполнение формы инвойса на основе текстового описания
   - Парсинг данных из естественного языка (клиент, позиции, налоги, скидки)
   - Использование модели Meta-Llama-3-8B-Instruct через Hugging Face API

5. **PDF-генерация:**
   - Генерация PDF для отдельного инвойса
   - Генерация PDF со всеми инвойсами (отчет)
   - Экспорт через системный диалог шаринга

6. **Валидация данных:**
   - Проверка обязательных полей
   - Валидация форматов дат (YYYY-MM-DD)
   - Проверка уникальности номеров инвойсов
   - Валидация числовых значений (количество, цена, налог, скидка)

---

## Main Modules

### Экранные модули (app/)

#### 1. `app/index.tsx` — Главный экран
**Назначение:** Отображение списка всех инвойсов и статистики

**Функциональность:**
- Загрузка инвойсов из хранилища при монтировании
- Отображение списка инвойсов в виде карточек (InvoiceCard)
- Статистика: количество инвойсов и общая сумма (total revenue)
- Кнопка создания нового инвойса
- Кнопка экспорта всех инвойсов в PDF
- Пустое состояние при отсутствии инвойсов
- Индикатор загрузки

**Ключевые компоненты:**
- `InvoiceCard` — карточка инвойса
- `FlatList` — список инвойсов
- `useInvoiceStore` — доступ к состоянию

#### 2. `app/create.tsx` — Экран создания/редактирования
**Назначение:** Форма для создания нового или редактирования существующего инвойса

**Функциональность:**
- Режим создания (новый инвойс) или редактирования (существующий)
- Определение режима через параметр `id` в URL (`/create?id=...`)
- AI-заполнение формы через текстовое описание
- Управление позициями (добавление, редактирование, удаление)
- Настройка налога и скидки через слайдеры
- Валидация всех полей с отображением ошибок
- Генерация PDF для текущего инвойса
- Сохранение/обновление инвойса
- Удаление инвойса (только в режиме редактирования)

**Секции формы:**
1. **AI Fill** — текстовое поле для AI-заполнения
2. **Client** — имя клиента
3. **Invoice Details** — номер, дата, срок оплаты
4. **Items** — список позиций (ItemRow компоненты)
5. **Finance** — налог и скидка (слайдеры)
6. **Totals** — отображение расчетов (subtotal, tax, discount, total)
7. **Notes** — дополнительные заметки

**Ключевые компоненты:**
- `ItemRow` — строка позиции
- `DatePicker` — календарь для выбора дат
- `Modal` — модальное окно для уведомлений
- `ConfirmModal` — модальное окно подтверждения удаления

### UI Компоненты (components/)

#### 1. `InvoiceCard.tsx`
**Назначение:** Карточка инвойса в списке

**Отображает:**
- Номер инвойса
- Дату создания
- Имя клиента
- Итоговую сумму
- Количество позиций

**Стилизация:** Темная тема с акцентной линией сверху

#### 2. `ItemRow.tsx`
**Назначение:** Компонент для редактирования позиции в инвойсе

**Функциональность:**
- Поля: описание, количество, цена
- Автоматический расчет подытога
- Валидация полей с отображением ошибок
- Кнопка удаления позиции
- Номер позиции (badge)

#### 3. `DatePicker.tsx`
**Назначение:** Кастомный календарь для выбора дат

**Функциональность:**
- Модальное окно с календарем
- Навигация по месяцам
- Выделение выбранной даты и сегодняшнего дня
- Валидация минимальной/максимальной даты
- Анимации открытия/закрытия

#### 4. `Modal.tsx`
**Назначение:** Базовое модальное окно для уведомлений

**Типы:** success, error, info
**Особенности:** Анимации (fade, scale, slide), эффект свечения, иконки

#### 5. `ConfirmModal.tsx`
**Назначение:** Модальное окно подтверждения действий (удаление)

### Сервисы (services/)

#### 1. `aiService.ts`
**Назначение:** Интеграция с Hugging Face AI для парсинга инвойсов

**Функции:**
- `parseInvoiceWithAI(prompt: string)` — парсинг текстового описания в структурированные данные

**Технические детали:**
- Использует модель `meta-llama/Meta-Llama-3-8B-Instruct`
- API ключ из переменной окружения `EXPO_PUBLIC_HF_TOKEN`
- Системный промпт для извлечения данных в JSON
- Очистка и парсинг JSON ответа от модели
- Обработка ошибок парсинга

**Возвращаемые данные:**
```typescript
interface ParsedInvoiceData {
  clientName?: string;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  taxRate?: number;
  discount?: number;
  notes?: string;
}
```

#### 2. `pdfService.ts`
**Назначение:** Генерация PDF документов из инвойсов

**Функции:**
- `generateInvoicePDF(invoice: Invoice)` — генерация PDF для одного инвойса
- `generateAllInvoicesPDF(invoices: Invoice[])` — генерация PDF со всеми инвойсами

**Технические детали:**
- Генерация HTML из данных инвойса
- Конвертация HTML в PDF через `expo-print`
- Открытие системного диалога шаринга через `expo-sharing`
- Стилизация PDF (профессиональный дизайн)
- Поддержка множественных инвойсов в одном PDF (с разделителями)

---

## State Management & Data

### Управление состоянием: Zustand

**Store:** `store/useInvoiceStore.ts`

**Структура состояния:**
```typescript
interface InvoiceStore {
  invoices: Invoice[];           // Массив всех инвойсов
  isLoading: boolean;            // Флаг загрузки
  
  // CRUD операции
  loadInvoices: () => Promise<void>;
  saveInvoices: () => Promise<void>;
  addInvoice: (input: CreateInvoiceInput) => Invoice;
  updateInvoice: (id: string, input: Partial<CreateInvoiceInput>) => void;
  deleteInvoice: (id: string) => void;
  getInvoice: (id: string) => Invoice | undefined;
  
  // AI интеграция
  setFullInvoice: (data: ParsedInvoiceData) => CreateInvoiceInput;
  
  // Расчеты
  calculateItemSubtotal: (quantity: number, price: number) => number;
  calculateInvoiceTotals: (items, taxRate, discount) => Totals;
  
  // Утилиты
  generateNextInvoiceNumber: () => string;
  isInvoiceNumberUnique: (invoiceNumber: string, excludeId?: string) => boolean;
}
```

### Персистентность данных

**Хранилище:** AsyncStorage
- **Ключ:** `@promptinvoice_invoices`
- **Формат:** JSON массив инвойсов
- **Синхронизация:** Автоматическая при каждом изменении (add, update, delete)

**Жизненный цикл:**
1. При загрузке приложения: `loadInvoices()` — загрузка из AsyncStorage
2. При изменении: автоматический вызов `saveInvoices()` после мутации
3. Данные сохраняются в формате JSON

### Типы данных

**Основные типы** (`types/invoice.ts`):

```typescript
interface Invoice {
  id: string;
  clientName: string;
  invoiceNumber: string;
  date: string;              // ISO string
  dueDate?: string;          // ISO string, опционально
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;           // 0-1 (0% - 100%)
  taxAmount: number;
  discount: number;          // 0-1 (0% - 100%)
  total: number;
  notes?: string;
  createdAt: string;         // ISO string
  updatedAt: string;         // ISO string
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface CreateInvoiceInput {
  clientName: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  items: Omit<InvoiceItem, 'id' | 'subtotal'>[];
  taxRate: number;
  discount: number;
  notes?: string;
}
```

### Взаимодействие с API

**Внешние API:**
1. **Hugging Face Inference API** (`@huggingface/inference`)
   - Endpoint: через SDK
   - Аутентификация: API токен из `EXPO_PUBLIC_HF_TOKEN`
   - Модель: `meta-llama/Meta-Llama-3-8B-Instruct`
   - Использование: только для AI-заполнения форм

**Локальные операции:**
- Все CRUD операции выполняются локально
- Нет backend сервера
- Данные хранятся только на устройстве

---

## Navigation & Routing

### Система навигации: Expo Router

**Тип:** File-based routing (аналогично Next.js)

**Структура маршрутов:**
```
/                    → app/index.tsx (главный экран)
/create              → app/create.tsx (создание нового инвойса)
/create?id=xxx        → app/create.tsx (редактирование инвойса с id=xxx)
```

### Реализация

**Корневой layout** (`app/_layout.tsx`):
```typescript
<Stack screenOptions={{ headerShown: false }} />
```
- Использует Stack навигацию
- Скрытые заголовки (кастомные хедеры в компонентах)

### Навигационные методы

**В компонентах:**
- `useRouter()` из `expo-router` — хук для навигации
- `useLocalSearchParams()` — получение параметров URL

**Примеры:**
```typescript
// Переход на экран создания
router.push('/create');

// Переход на редактирование с параметром
router.push({
  pathname: '/create',
  params: { id: invoice.id }
});

// Возврат назад
router.back();
```

### Особенности
- Нет таб-навигации (только Stack)
- Параметры передаются через URL query string
- Навигация программная (через router) и декларативная (через TouchableOpacity)

---

## Dependencies

### Критически важные зависимости

#### Core Framework
- `expo` (~54.0.31) — основной фреймворк
- `react` (19.1.0) — React библиотека
- `react-native` (0.81.5) — React Native
- `expo-router` (~6.0.21) — файловая маршрутизация

#### State Management
- `zustand` (^5.0.10) — управление состоянием

#### Navigation
- `@react-navigation/native` (^7.1.8) — базовая навигация
- `@react-navigation/bottom-tabs` (^7.4.0) — табы (не используется активно)
- `react-native-screens` (~4.16.0) — нативные экраны
- `react-native-safe-area-context` (~5.6.0) — безопасные зоны

#### Data Persistence
- `@react-native-async-storage/async-storage` (^2.2.0) — локальное хранилище

#### UI Components
- `@expo/vector-icons` (^15.0.3) — иконки (Ionicons)
- `@react-native-community/slider` (^5.1.2) — слайдеры для налога/скидки

#### PDF & Sharing
- `expo-print` (~15.0.8) — генерация PDF
- `expo-sharing` (~14.0.8) — системный шаринг

#### AI Integration
- `@huggingface/inference` (^4.13.9) — Hugging Face API клиент

#### Animations
- `react-native-reanimated` (~4.1.1) — анимации (используется в компонентах)
- `react-native-gesture-handler` (~2.28.0) — обработка жестов

#### Utilities
- `expo-constants` (~18.0.13) — константы Expo
- `expo-linking` (~8.0.11) — deep linking
- `expo-haptics` (~15.0.8) — тактильная обратная связь

### Dev Dependencies
- `typescript` (~5.9.2) — TypeScript компилятор
- `@types/react` (~19.1.0) — типы для React
- `eslint` (^9.25.0) — линтер
- `eslint-config-expo` (~10.0.0) — конфигурация ESLint для Expo

### Версионирование
- Используется семантическое версионирование
- Expo SDK: ~54.0.31 (совместимость в пределах минорных версий)
- React 19.1.0 (новая мажорная версия)

---

## Current Status

### Текущее состояние проекта

**Статус:** Рабочая версия с полным функционалом

### Ключевые файлы для разработки

#### Основные экраны
1. **`app/index.tsx`** — главный экран со списком инвойсов
   - Загрузка данных
   - Отображение статистики
   - Навигация к созданию/редактированию

2. **`app/create.tsx`** — форма создания/редактирования
   - Самая сложная часть приложения (~1000 строк)
   - Валидация, AI-интеграция, PDF-генерация
   - Управление позициями

#### State Management
3. **`store/useInvoiceStore.ts`** — центральный store
   - Вся бизнес-логика работы с инвойсами
   - Персистентность данных
   - Расчеты и утилиты

#### Сервисы
4. **`services/aiService.ts`** — AI интеграция
   - Парсинг текста в структурированные данные
   - Обработка ошибок API

5. **`services/pdfService.ts`** — PDF генерация
   - HTML шаблоны
   - Конвертация в PDF

#### Типы
6. **`types/invoice.ts`** — TypeScript типы
   - Определение структуры данных
   - Интерфейсы для всех операций

### Активная разработка

**Текущие возможности:**
- ✅ Полный CRUD функционал
- ✅ AI-заполнение форм
- ✅ PDF генерация
- ✅ Валидация данных
- ✅ Локальное хранение

**Потенциальные области для улучшения:**
- Облачная синхронизация
- Экспорт в другие форматы (CSV, Excel)
- Расширенная аналитика
- Мультиязычность
- Темы оформления
- Офлайн режим для AI (локальная модель)

### Конфигурация

**`app.json`:**
- Название: PromptInvoice
- Версия: 1.0.0
- Новая архитектура: включена
- Эксперименты: typedRoutes, reactCompiler

**Переменные окружения:**
- `EXPO_PUBLIC_HF_TOKEN` — обязательна для AI функций

### Технический долг
- Нет unit тестов
- Нет интеграционных тестов
- Ограниченная обработка ошибок сети
- Нет офлайн режима для AI

---

## Дополнительная информация

### Особенности реализации

1. **Автоматическая нумерация инвойсов:**
   - Формат: INV-001, INV-002, ...
   - Поиск максимального номера среди существующих
   - Валидация уникальности при редактировании

2. **Расчеты:**
   - Все расчеты округляются до 2 знаков после запятой
   - Скидка применяется к подытогу (до налога)
   - Налог применяется к подытогу

3. **Валидация:**
   - Реал-тайм валидация с задержкой 300ms
   - Отображение ошибок под полями
   - Блокировка сохранения при наличии ошибок

4. **AI обработка:**
   - Очистка JSON ответа от markdown разметки
   - Fallback на поиск JSON в тексте
   - Детальная обработка ошибок парсинга

### Производительность
- Использование `React.memo` для ItemRow
- Оптимизация FlatList с keyExtractor
- Ленивая загрузка данных при монтировании

### Безопасность
- API ключ хранится в переменных окружения
- Локальное хранение данных (нет передачи на сервер)
- Валидация всех пользовательских вводов

---

*Документ создан для передачи контекста внешней AI-модели. Последнее обновление: 2024*

