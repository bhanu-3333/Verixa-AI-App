"""
Models package init
"""

from app.models.user import UserModel
from app.models.chat import ChatModel
from app.models.hospital import HospitalModel
from app.models.bank import BankModel
from app.models.emergency import EmergencyModel

__all__ = ["UserModel", "ChatModel", "HospitalModel", "BankModel", "EmergencyModel"]
