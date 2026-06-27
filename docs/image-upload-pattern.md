# Image Upload Pattern

## القاعدة الأساسية

**دايمًا احفظ المسار النسبي في قاعدة البيانات — مش URL كامل.**

```php
// ❌ غلط
$imageUrl = url($path);          // يولّد http://127.0.0.1:8000/uploads/...
$imageUrl = asset($path);        // نفس المشكلة

// ✅ صح
$imageUrl = '/' . $path;         // يحفظ /uploads/tenant_1/brands/file.jpg
```

## السبب

Next.js frontend يشتغل على port مختلف عن Laravel backend. الـ proxy في `next.config.js` بيوجّه:
- `/api/*` → `http://127.0.0.1:8000/api/*`
- `/uploads/*` → `http://127.0.0.1:8000/uploads/*`

لو حفظت URL كامل (`http://127.0.0.1:8000/uploads/...`)، المتصفح هيحاول يفتحه مباشرة بدون ما يمر على الـ proxy — وده بيفشل في بيئات مختلفة (Docker، production، إلخ).

## Pattern صح لأي upload جديد

```php
public function store(Request $request): JsonResponse
{
    if ($request->hasFile('image')) {
        $file = $request->file('image');
        $filename = time() . '_' . uniqid() . '.' . $file->extension();
        $file->move(public_path("uploads/tenant_{$tenantId}/my-entity"), $filename);
        $imageUrl = "/uploads/tenant_{$tenantId}/my-entity/{$filename}";
        // ↑ نسبي — مش url() أو asset()
    }
}
```

## حذف الصور القديمة

```php
// ❌ غلط — storage/public مش نفس public/uploads
Storage::disk('public')->delete($path);

// ✅ صح
@unlink(public_path(ltrim($model->image_url, '/')));
```

## Frontend — عرض الصور

استخدم `toRelativeImageUrl` من `@/lib/utils` دايمًا في `<img src>`:

```tsx
import { toRelativeImageUrl } from '@/lib/utils';

<img src={toRelativeImageUrl(entity.image_url)} />
```

الدالة تتعامل مع القيم القديمة (absolute URL) والجديدة (relative path) على حدٍّ سواء.

## إضافة مجلد upload جديد

لو محتاج تضيف مجلد upload جديد (مش `/uploads/`):

1. ارفع الملف في `public_path("new-folder/...")`.
2. احفظ المسار النسبي `/new-folder/...`.
3. أضف rewrite في `frontend/next.config.js`:

```js
{
    source: '/new-folder/:path*',
    destination: 'http://127.0.0.1:8000/new-folder/:path*',
}
```

## Rewrites الحالية في next.config.js

| Source | Destination |
|--------|-------------|
| `/api/:path*` | `http://127.0.0.1:8000/api/:path*` |
| `/uploads/:path*` | `http://127.0.0.1:8000/uploads/:path*` |
