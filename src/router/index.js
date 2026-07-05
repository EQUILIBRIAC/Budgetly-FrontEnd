import { createRouter, createWebHistory } from 'vue-router';

const LogInComponent = () => import('@/IAM/components/log-in.vue');
const SignUpComponent = () => import('@/IAM/components/signup.vue');
const ForgotPasswordComponent = () => import('@/IAM/components/forgot-password.vue');
const HomeRepresentativeComponent = () => import('@/household-representative/pages/home-representative.component.vue');
const HomeMemberComponent = () => import('@/household-member/pages/home-member.component.vue');

// Member dashboard components
const ContributionsComponent = () => import('@/household-member/components/contributions.component.vue');
const HouseholdStatusComponent = () => import('@/household-member/components/household-status.component.vue');
const SearchHouseholdComponent = () => import('@/household-member/components/search-household.component.vue');
const SettingsComponent = () => import('@/household-member/components/settings.component.vue');
const DashboardHomeComponent = () => import('@/household-member/components/dashboard-home.component.vue');

const routes = [
  { path: '/', component: LogInComponent },
  { path: '/login', name: 'login', component: LogInComponent, meta: { title: 'Log In' } },
  { path: '/signup', name: 'signup', component: SignUpComponent, meta: { title: 'Sign Up' } },
  { path: '/forgot-password', name: 'forgot-password', component: ForgotPasswordComponent, meta: { title: 'Forgot Password' } },
  {
    path: '/dashboard/representative',
    name: 'representative-dashboard',
    component: HomeRepresentativeComponent,
    redirect: { name: 'representative-dashboard-home' },
    meta: { requiresAuth: true, role: 'representative', title: 'Representative Dashboard' },
    children: [
      {
        path: '',
        name: 'representative-dashboard-home',
        component: () => import('@/household-representative/components/dashboard-home.component.vue'),
        meta: { title: 'Home' }
      },
      {
        path: 'household/:id',
        name: 'household-edit',
        component: () => import('@/households/presentation/views/create-household.page.vue'),
        props: true,
        meta: { requiresAuth: true, role: 'representative', title: 'Edit Household' }
      },
      {
        path: 'households',
        name: 'household-list',
        component: () => import('@/households/presentation/components/household-list.component.vue'),
        meta: { title: 'Households' }
      },
      {
        path: 'members',
        name: 'members-management',
        component: () => import('@/household-representative/components/members.component.vue'),
        meta: { title: 'Members Management' }
      },
      {
        path: 'expenses',
        name: 'expenses-management',
        component: () => import('@/household-representative/components/expenses.component.vue'),
        meta: { title: 'Expenses Management' }
      },
      {
        path: 'contribution/:householdId?',
        name: 'contribution-management',
        component: () => import('@/household-representative/components/contribution.component.vue'),
        props: true,
        meta: { title: 'Contributions Management' }
      },
      {
        path: 'settings',
        name: 'representative-settings',
        component: () => import('@/household-representative/components/settings.component.vue'),
        meta: { title: 'Settings' }
      },
      {
        path: 'profile',
        name: 'representative-profile',
        component: () => import('@/profiles/presentation/views/profile.page.vue'),
        meta: { title: 'Profile' }
      }
    ]
  },
  {
    path: '/dashboard/member',
    name: 'member-dashboard',
    component: HomeMemberComponent,
    redirect: { name: 'member-dashboard-home' },
    meta: { requiresAuth: true, role: 'member', title: 'Member Dashboard' },
    children: [
      {
        path: '',
        name: 'member-dashboard-home',
        component: DashboardHomeComponent,
        meta: { requiresAuth: true, role: 'member', title: 'Home' }
      },
      {
        path: 'contributions',
        name: 'member-contributions',
        component: ContributionsComponent,
        meta: { requiresAuth: true, role: 'member', title: 'My Contributions' }
      },
      {
        path: 'household-status',
        name: 'household-status',
        component: HouseholdStatusComponent,
        meta: { requiresAuth: true, role: 'member', title: 'Household Status' }
      },
      {
        path: 'search',
        name: 'search-household',
        component: SearchHouseholdComponent,
        meta: { requiresAuth: true, role: 'member', title: 'Search Household' }
      },
      {
        path: 'settings',
        name: 'member-settings',
        component: SettingsComponent,
        meta: { requiresAuth: true, role: 'member', title: 'Settings' }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const stored = localStorage.getItem('user');
  const user = stored ? JSON.parse(stored) : null;
  const role = user?.role || 'representative';

  if (to.meta.requiresAuth && !user) {
    next({ name: 'login' });
  } else if (to.meta.requiresAuth && to.meta.role && to.meta.role !== role) {
    next({ name: role === 'member' ? 'member-dashboard' : 'representative-dashboard' });
  } else {
    next();
  }
});

export default router;
