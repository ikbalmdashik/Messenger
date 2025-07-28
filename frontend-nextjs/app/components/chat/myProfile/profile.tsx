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
} from "lucide-react";
import { useEffect, useState } from "react";
import useCurrentUser, { initialUser } from "@/app/hooks/user/useCurrentUser";

const ProfileDialog = () => {
    const [userId, setUserId] = useState<number | null>(null);
    const [open, setOpen] = useState(false);
    const [editable, setEditable] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [hasChanged, setHasChanged] = useState(false);

    useEffect(() => {
        const id = Number(sessionStorage.getItem("loginId"));
        if (!isNaN(id)) setUserId(id);
    }, [userId]);

    const user = useCurrentUser(userId);
    const isLoading = userId === null || user === initialUser;

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        role: "",
    });

    useEffect(() => {
        if (user && user !== initialUser) {
            const newForm = {
                fullName: user.fullName || "",
                email: user.email || "",
                phone: user.phone || "",
                role: user.role || "",
            };
            setFormData(newForm);
            setHasChanged(false);
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const updated = { ...prev, [name]: value };
            const changed =
                updated.fullName !== user.fullName ||
                updated.email !== user.email ||
                updated.phone !== user.phone;
            setHasChanged(changed);
            return updated;
        });
    };

    const handleUpdate = () => {
        console.log("Updated data:", {
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
        });
        setEditable(false);
        setHasChanged(false);
    };

    const handleConfirmDelete = () => {
        console.log("Deleted user:", formData);
        setConfirmDelete(false);
        setOpen(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        className="flex items-center gap-2 border border-black/30 dark:border-white/20"
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
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    disabled={!editable}
                                    placeholder="Full Name"
                                    className="pl-10"
                                />
                            </div>

                            {/* Email */}
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={!editable}
                                    placeholder="Email"
                                    className="pl-10"
                                />
                            </div>

                            {/* Phone */}
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    disabled={!editable}
                                    placeholder="Phone"
                                    className="pl-10"
                                />
                            </div>

                            {/* Role (not editable) */}
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    name="role"
                                    value={formData.role}
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
                                    disabled={editable && !hasChanged}
                                    onClick={() => {
                                        if (editable && hasChanged) {
                                            handleUpdate();
                                        } else {
                                            setEditable(true);
                                        }
                                    }}
                                >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    {editable ? (hasChanged ? "Update" : "Cancel") : "Edit"}
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
                        <p><strong>Name:</strong> {formData.fullName}</p>
                        <p><strong>Email:</strong> {formData.email}</p>
                        <p><strong>Phone:</strong> {formData.phone}</p>
                        <p><strong>Role:</strong> {formData.role}</p>
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
