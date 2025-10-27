
'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCollection,
  useFirestore,
  addDocumentNonBlocking,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  query,
  orderBy,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const UserProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
});

type UserProfileForm = z.infer<typeof UserProfileSchema>;

function AddUserForm() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<UserProfileForm>({
    resolver: zodResolver(UserProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  const onSubmit = async (values: UserProfileForm) => {
    if (!firestore) return;

    const clientsRef = collection(firestore, 'client');
    const newUser = {
      ...values,
      validationStatus: 'valid',
      id: '', // Firestore will generate this
    };

    addDocumentNonBlocking(clientsRef, newUser);

    toast({
      title: 'User Added',
      description: `User ${values.firstName} ${values.lastName} has been added to the database.`,
    });

    form.reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New User</CardTitle>
        <CardDescription>
          Add a new authorized sender to the database.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
               <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Add User</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function UserList() {
  const firestore = useFirestore();

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'client'), orderBy('lastName', 'asc'));
  }, [firestore]);

  const { data: users, isLoading, error } = useCollection(clientsQuery);

  if (isLoading) {
    return <p>Loading users...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error loading users: {error.message}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registered Users</CardTitle>
        <CardDescription>
          This is the list of senders authorized to be processed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                     <Badge variant={user.validationStatus === 'valid' ? 'default' : 'secondary'}>
                        {user.validationStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


export default function UsersPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
        <p className="text-gray-600">
            View, add, and manage authorized email senders.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UserList />
        </div>
        <div>
          <AddUserForm />
        </div>
      </div>
    </div>
  );
}
