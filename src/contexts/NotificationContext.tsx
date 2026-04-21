import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  type: 'new_question' | 'poll_update' | 'resource_shared' | 'system';
  title: string;
  message: string;
  classId?: string;
  link?: string;
  read: boolean;
  createdAt: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  createNotification: (userId: string, data: Partial<Notification>) => Promise<void>;
  notifyClassMembers: (classId: string, currentUserId: string, data: Partial<Notification>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(data.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (error) => {
      console.warn("Notifications listener failed:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'notifications', notificationId), {
      read: true
    });
  };

  const createNotification = async (userId: string, data: Partial<Notification>) => {
    const docRef = doc(collection(db, 'users', userId, 'notifications'));
    await setDoc(docRef, {
      notificationId: docRef.id,
      userId,
      read: false,
      createdAt: serverTimestamp(),
      ...data
    });
  };

  const notifyClassMembers = async (classId: string, currentUserId: string, data: Partial<Notification>) => {
    const membersSnap = await getDocs(collection(db, 'classrooms', classId, 'members'));
    const memberIds = membersSnap.docs.map(doc => doc.id).filter(id => id !== currentUserId);
    
    const promises = memberIds.map(memberId => createNotification(memberId, data));
    await Promise.all(promises);
  };

  const unreadCount = notifications.length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, createNotification, notifyClassMembers }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
