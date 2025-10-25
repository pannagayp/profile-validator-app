'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createProfile } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export function ProfileForm() {
  const { toast } = useToast();
  const [state, formAction] = useFormState(createProfile, null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  useEffect(() => {
    if (state) {
      toast({
        title: state.type === 'success' ? 'Success!' : 'Oops!',
        description: state.message,
        variant: state.type === 'error' ? 'destructive' : 'default',
      });
      if (state.type === 'success') {
        form.reset();
      }
    }
  }, [state, toast, form]);

  const { isSubmitting } = form.formState;

  return (
    <Card>
      <Form {...form}>
        <form action={formAction} className="space-y-8">
          <CardHeader>
            <CardTitle>Add by Email</CardTitle>
            <CardDescription>Enter an email to create and validate a new profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-muted"></div>
              <span className="flex-shrink mx-4 text-muted-foreground text-xs">OR</span>
              <div className="flex-grow border-t border-muted"></div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="w-full" disabled>
                    <Mail className="mr-2 h-4 w-4" /> Connect with Gmail
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Gmail OAuth connection is coming soon.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create and Validate
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
