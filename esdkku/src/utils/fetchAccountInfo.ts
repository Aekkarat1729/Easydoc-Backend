import { useDocumentStore } from "@/stores/useDocumentStore";
import { useUserStore } from "@/stores/useUserStore";
import { appStore } from "@/stores/appStore";
import { useDefaultFile } from "@/stores/useDefaultFile";

export async function fetchAccountInfo() {
    const userStore = useUserStore.getState();
    const documentStore = useDocumentStore.getState();
    const { setLoading } = appStore.getState();
    const { fetchDefaultFile } = useDefaultFile.getState();

    console.log('🚀 fetchAccountInfo started');
    console.log('🔧 IS_PRODUCTION:', process.env.NEXT_PUBLIC_IS_PRODUCTION);

    setLoading(true);

    try {
        const esdData = localStorage.getItem("esd-kku");
        const parsed = esdData ? JSON.parse(esdData) : null;
        const role = parsed?.role;

        console.log('👤 User role:', role);

        userStore.loadUserFromStorage();

        if (process.env.NEXT_PUBLIC_IS_PRODUCTION === 'false') {
            console.log('🛠️ Running in development mode');
            await Promise.all([
                userStore.fetchUserNameId(),
                documentStore.fetchOfficerMail(),
                documentStore.fetchUserMail(),
                userStore.fetchAllUserForAdmin(),
                documentStore.fetchOfficerMail(),
                fetchDefaultFile()
            ]);
            return; // Return early if in development mode
        }

        console.log('🏭 Running in production mode');

        if (role === 1) {
            // admin
            console.log('👑 Admin role detected');
            await Promise.all([
                await userStore.fetchAllUserForAdmin()
            ]);
            await userStore.fetchAllUserForAdmin();
        } else if (role === 2) {
            // officer
            console.log('👮 Officer role detected');
            await Promise.all([
                await userStore.fetchUserNameId(),
                await documentStore.fetchOfficerMail(),
            ]);
            //user
        } else if (role === 3) {
            console.log('👤 User role detected');
            await Promise.all([
                await documentStore.fetchUserMail(),
                await userStore.fetchUserNameId(),
            ]);
        }
        
        console.log('📁 Fetching default files...');
        await Promise.all([
            await fetchDefaultFile()
        ]);
        console.log('✅ fetchAccountInfo completed');
    } catch (error) {
        console.error("❌ fetchAccountInfo error:", error);
    } finally {
        setLoading(false);
    }
}