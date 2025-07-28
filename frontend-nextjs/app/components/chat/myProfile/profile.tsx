"use client";

import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    User,
    Mail,
    Phone,
    Shield,
    Pencil,
    Trash2,
    X,
    Check,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import useCurrentUser, { initialUser } from "@/app/hooks/user/useCurrentUser";
import axios from "axios";
import API_ENDPOINTS from "@/app/routes/api";
import { toast } from "sonner";

const ProfileDialog = () => {
    const [userId, setUserId] = useState<number | null>(null);
    const [open, setOpen] = useState(false);
    const [editable, setEditable] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [formInitialValues, setFormInitialValues] = useState({
        fullName: "",
        email: "",
        phone: "",
    });

    const user = useCurrentUser(userId);
    const isLoading = userId === null || user === initialUser;

    const { register, reset, watch } = useForm({
        defaultValues: {
            fullName: "",
            email: "",
            phone: "",
            role: "",
        },
    });

    const watchFields = watch();

    useEffect(() => {
        const id = Number(sessionStorage.getItem("loginId"));
        if (!isNaN(id)) setUserId(id);
    }, []);

    useEffect(() => {
        if (user && user !== initialUser) {
            reset({
                fullName: user.fullName || "",
                email: user.email || "",
                phone: user.phone || "",
                role: user.role || "",
            });
            setFormInitialValues({
                fullName: user.fullName || "",
                email: user.email || "",
                phone: user.phone || "",
            });
        }
    }, [user, reset]);

    const hasChanged =
        watchFields.fullName !== formInitialValues.fullName ||
        watchFields.email !== formInitialValues.email ||
        watchFields.phone !== formInitialValues.phone;

    const handleUpdate = async () => {
        try {
            const updatedData = {
                userId,
                fullName: watchFields.fullName,
                email: watchFields.email,
                phone: watchFields.phone,
                role: watchFields.role,
            };

            await axios.post(API_ENDPOINTS.UpdateUser, updatedData);

            toast.success("Profile updated successfully.");

            setFormInitialValues({
                fullName: updatedData.fullName,
                email: updatedData.email,
                phone: updatedData.phone,
            });

            setEditable(false);
        } catch (error) {
            toast.error("Failed to update profile.");
            console.error(error);
        }
    };

    const handleConfirmDelete = async () => {
        try {
            // Simulate delete API
            await axios.post(API_ENDPOINTS.DeleteUser, { id: userId });

            toast.custom((t) => (
                <div className="flex items-center gap-4 bg-red-600 text-white px-4 py-2 rounded shadow">
                    <Trash2 className="w-5 h-5" />
                    <div>
                        <p className="font-semibold">User Deleted</p>
                        <p className="text-sm opacity-90">The user account has been successfully deleted.</p>
                    </div>
                    <button onClick={() => toast.dismiss(t)} className="ml-auto font-bold px-2">
                        ×
                    </button>
                </div>
            ));

            setConfirmDelete(false);
            setOpen(false);
        } catch (error) {
            toast.custom((t) => (
                <div className="flex items-center gap-4 bg-red-500 text-white px-4 py-2 rounded shadow">
                    <X className="w-5 h-5" />
                    <div>
                        <p className="font-semibold">Delete Failed</p>
                        <p className="text-sm opacity-90">Something went wrong. Please try again.</p>
                    </div>
                    <button onClick={() => toast.dismiss(t)} className="ml-auto font-bold px-2">
                        ×
                    </button>
                </div>
            ));
        }
    };

    const myProfileClick = async () => {
        try {
            const profile = (
                await axios.get(API_ENDPOINTS.GetUserById + userId)
            ).data;

            setFormInitialValues({
                fullName: profile.fullName,
                email: profile.email,
                phone: profile.phone,
            });

            reset(profile);
            setEditable(false);
            setOpen(true);
        } catch (err) {
            toast.error("Failed to fetch profile.");
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        className="flex items-center gap-2 border border-black/30 dark:border-white/20"
                        onClick={myProfileClick}
                    >
                        <User className="w-4 h-4" />
                        My Profile
                    </Button>
                </DialogTrigger>

                <DialogContent
                    className="max-w-md border border-black/30 dark:border-white/20"
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <DialogHeader className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-white">Profile</DialogTitle>
                            <DialogDescription>This is your profile info.</DialogDescription>
                        </div>
                    </DialogHeader>

                    {isLoading ? (
                        <p className="text-center text-sm text-muted-foreground">Loading...</p>
                    ) : (
                        <div className="space-y-4 pt-2">
                            {/* Full Name */}
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    {...register("fullName")}
                                    disabled={!editable}
                                    placeholder="Full Name"
                                    className="pl-10"
                                />
                            </div>

                            {/* Email */}
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    {...register("email")}
                                    disabled={!editable}
                                    placeholder="Email"
                                    className="pl-10"
                                />
                            </div>

                            {/* Phone */}
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    {...register("phone")}
                                    disabled={!editable}
                                    placeholder="Phone"
                                    className="pl-10"
                                />
                            </div>

                            {/* Role */}
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    {...register("role")}
                                    disabled
                                    placeholder="Role"
                                    className="pl-10"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-between pt-2">
                                <Button
                                    variant="destructive"
                                    onClick={() => setConfirmDelete(true)}
                                    className="flex gap-2 items-center"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Account
                                </Button>

                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        if (!editable) {
                                            setEditable(true);
                                        } else if (editable && hasChanged) {
                                            handleUpdate();
                                        } else if (editable && !hasChanged) {
                                            reset(formInitialValues);
                                            setEditable(false);
                                            toast("Changes discarded.");
                                        }
                                    }}
                                >
                                    {!editable && (
                                        <>
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Edit
                                        </>
                                    )}
                                    {editable && hasChanged && (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            Update
                                        </>
                                    )}
                                    {editable && !hasChanged && (
                                        <>
                                            <X className="w-4 h-4 mr-2" />
                                            Cancel
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Confirm Delete</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this account?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="text-sm space-y-1">
                        <p><strong>Name:</strong> {watchFields.fullName}</p>
                        <p><strong>Email:</strong> {watchFields.email}</p>
                        <p><strong>Phone:</strong> {watchFields.phone}</p>
                        <p><strong>Role:</strong> {watchFields.role}</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                            Go Back
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmDelete}>
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ProfileDialog;
