-- Create profiles table for user data and trial management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  empresa TEXT,
  nif TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'gestor' CHECK (role IN ('admin', 'gestor', 'fiscal', 'cliente', 'financeiro', 'sales')),
  trial_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  trial_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  trial_expired BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check and update trial status
CREATE OR REPLACE FUNCTION public.check_trial_expired()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_end < now() AND NEW.trial_expired = false THEN
    NEW.trial_expired = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-update trial_expired
CREATE TRIGGER check_trial_on_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_trial_expired();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically create profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Create failed login attempts table for security
CREATE TABLE public.failed_login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for quick lookups on email and time
CREATE INDEX idx_failed_login_email_time ON public.failed_login_attempts(email, attempted_at);

-- Enable RLS on failed_login_attempts (admin only access, no public policies)
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;