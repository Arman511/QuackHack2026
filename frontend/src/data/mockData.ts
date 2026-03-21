export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  isImpulse: boolean;
  horseMessage?: string;
}

export interface Punishment {
  id: string;
  date: string;
  transactionId: string;
  transactionDesc: string;
  transactionAmount: number;
  punishment: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  icon: string;
}

export interface Notification {
  id: string;
  date: string;
  title: string;
  message: string;
  type: 'impulse' | 'punishment' | 'savings' | 'info';
}

export const horseMessages = [
  "Whoa there cowboy… another impulse buy 🐴",
  "Stop horsing around! 🐎",
  "That purchase just fed the savings horse 🌾",
  "Easy there partner 🤠",
  "The horse noticed that impulse 👀",
  "Whoa there partner 🐴",
  "That purchase just cost you hay 🌾",
  "The savings stallion approves 🏇",
];

export const mockTransactions: Transaction[] = [
  { id: '1', date: '2026-03-21', description: 'Coffee - Starbucks', amount: 5.40, category: 'Coffee', isImpulse: true, horseMessage: horseMessages[0] },
  { id: '2', date: '2026-03-21', description: 'Steam - Elden Ring DLC', amount: 35, category: 'Steam / Video Games', isImpulse: true, horseMessage: horseMessages[1] },
  { id: '3', date: '2026-03-20', description: 'Tesco Groceries', amount: 42.50, category: 'Groceries', isImpulse: false },
  { id: '4', date: '2026-03-20', description: 'Uber Eats - Pizza', amount: 18.99, category: 'Food Delivery', isImpulse: true, horseMessage: horseMessages[3] },
  { id: '5', date: '2026-03-19', description: 'Amazon - Phone Case', amount: 12.99, category: 'Amazon Shopping', isImpulse: true, horseMessage: horseMessages[4] },
  { id: '6', date: '2026-03-18', description: 'Rent Payment', amount: 650, category: 'Bills', isImpulse: false },
  { id: '7', date: '2026-03-17', description: 'ASOS - Jacket', amount: 55, category: 'Clothes', isImpulse: true, horseMessage: horseMessages[5] },
  { id: '8', date: '2026-03-16', description: 'Costa Coffee', amount: 4.20, category: 'Coffee', isImpulse: true, horseMessage: horseMessages[6] },
  { id: '9', date: '2026-03-15', description: 'Spotify Subscription', amount: 10.99, category: 'Subscriptions', isImpulse: false },
  { id: '10', date: '2026-03-14', description: 'Deliveroo - Sushi', amount: 22, category: 'Food Delivery', isImpulse: true, horseMessage: horseMessages[2] },
  { id: '11', date: '2026-03-12', description: 'Steam - Indie Game', amount: 8.99, category: 'Steam / Video Games', isImpulse: true, horseMessage: horseMessages[0] },
  { id: '12', date: '2026-03-10', description: 'Coffee - Nero', amount: 3.80, category: 'Coffee', isImpulse: true, horseMessage: horseMessages[7] },
  { id: '13', date: '2026-03-08', description: 'Waterstones - Novel', amount: 9.99, category: 'Books', isImpulse: true, horseMessage: horseMessages[1] },
  { id: '14', date: '2026-03-05', description: 'Phone Bill', amount: 25, category: 'Bills', isImpulse: false },
  { id: '15', date: '2026-03-03', description: 'JD Sports - Trainers', amount: 89, category: 'Clothes', isImpulse: true, horseMessage: horseMessages[3] },
];

export const mockPunishments: Punishment[] = [
  {
    id: 'p1', date: '2026-03-17', transactionId: '7', transactionDesc: '£55 ASOS Jacket', transactionAmount: 55,
    punishment: 'Texted your friends: "Come watch me Hobby Horsing at Local Ground 123 on Friday the 13th of April" 🐴📱',
  },
  {
    id: 'p2', date: '2026-03-14', transactionId: '10', transactionDesc: '£22 Deliveroo Sushi', transactionAmount: 22,
    punishment: 'Spammed your inbox with 47 horse memes 📧🐎',
  },
  {
    id: 'p3', date: '2026-03-03', transactionId: '15', transactionDesc: '£89 JD Sports Trainers', transactionAmount: 89,
    punishment: 'Played a loud horse neigh when you tapped with NFC. Hah loser 🔊🐴',
  },
];

export const mockNotifications: Notification[] = [
  { id: 'n1', date: '2026-03-21', title: '£35 Steam purchase detected', message: 'Neigh-Tax applied: £35 saved 🐴', type: 'impulse' },
  { id: 'n2', date: '2026-03-20', title: 'Impulse budget warning', message: "You've spent 45% of your impulse budget. The horse is watching 👀", type: 'info' },
  { id: 'n3', date: '2026-03-17', title: 'Impulse budget exceeded!', message: 'Punishment triggered: Texted your friends about hobby horsing 📱🐴', type: 'punishment' },
  { id: 'n4', date: '2026-03-14', title: 'Late night takeaway detected', message: 'Horse is disappointed 😔🐴', type: 'impulse' },
  { id: 'n5', date: '2026-03-10', title: 'Weekly savings update', message: "You've saved £45 this week. The stallion approves! 🏇", type: 'savings' },
  { id: 'n6', date: '2026-03-03', title: 'Budget exceeded again!', message: 'Punishment: Horse neigh on NFC tap activated 🔊', type: 'punishment' },
];

export const impulseCategories = [
  'Steam / Video Games', 'Coffee', 'Takeaway', 'Clothes', 'Makeup',
  'Books', 'Amazon Shopping', 'Gadgets', 'Food Delivery',
];

export const bankOptions = [
  { name: 'Monzo', color: '#FF5A5F' },
  { name: 'Barclays', color: '#00AEEF' },
  { name: 'HSBC', color: '#DB0011' },
  { name: 'Chase', color: '#117ACA' },
];

export const goalPresets = [
  { name: 'Travel', icon: '✈️' },
  { name: 'Emergency Fund', icon: '🛡️' },
  { name: 'New Laptop', icon: '💻' },
  { name: 'First Apartment', icon: '🏠' },
  { name: 'Pay Off Debt', icon: '💳' },
];
