from rest_framework import permissions

class IsDealerUser(permissions.BasePermission):
    """Allows access only to dealer administrators and staff."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_dealer)


class IsCustomerUser(permissions.BasePermission):
    """Allows access only to authenticated customers."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_customer)


class IsTechnicianUser(permissions.BasePermission):
    """Allows access to technicians or dealership administrators."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and (request.user.is_technician or request.user.is_dealer)
        )


class IsOwnerOrDealer(permissions.BasePermission):
    """Object-level permission: owner can view/edit, dealer can manage."""
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_dealer or request.user.is_superuser:
            return True
        user_field = getattr(obj, 'user', None) or getattr(obj, 'customer', None)
        return user_field == request.user
