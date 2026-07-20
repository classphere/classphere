-- Reusable institute study material. Run after the existing tenant migrations.
CREATE TABLE IF NOT EXISTS public.institute_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('pdf', 'link', 'video', 'note')),
  resource_url TEXT,
  content TEXT,
  exam_code TEXT,
  subject TEXT,
  chapter TEXT,
  topic TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  ,CONSTRAINT institute_resources_payload_check CHECK (
    (resource_type = 'note' AND content IS NOT NULL AND char_length(content) > 0)
    OR (resource_type <> 'note' AND resource_url IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.institute_resource_batches (
  resource_id UUID NOT NULL REFERENCES public.institute_resources(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, batch_id)
);

CREATE INDEX IF NOT EXISTS idx_institute_resources_student_feed
  ON public.institute_resources (institute_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_institute_resource_batches_batch
  ON public.institute_resource_batches (batch_id, resource_id);

ALTER TABLE public.institute_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institute_resource_batches ENABLE ROW LEVEL SECURITY;
-- API service-role queries enforce live institute and batch membership. Do not
-- grant direct authenticated policies here; that would bypass those checks.
