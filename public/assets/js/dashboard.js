import { checkAuth, logoutUser } from './auth.js'
import { getDocuments, COLLECTIONS } from './firestore.js'

const navUserName = document.getElementById('navUserName')
const logoutBtn = document.getElementById('logoutBtn')
const statAvailable = document.getElementById('statAvailable')
const statRented = document.getElementById('statRented')
const statCustomers = document.getElementById('statCustomers')

checkAuth(async (user) => {
    if (!user) {
        window.location.href = './login.html'
        return
    }
    navUserName.textContent = user.displayName || user.email
    await loadBasicStats()
})

const loadBasicStats = async () => {
    try {
        const [vehiclesRes, usersRes] = await Promise.all([
            getDocuments(COLLECTIONS.VEHICLES),
            getDocuments(COLLECTIONS.USERS)
        ])

        if (vehiclesRes.success) {
            const available = vehiclesRes.data.filter(v => v.status === 'available').length
            const rented = vehiclesRes.data.filter(v => v.status === 'rented').length
            statAvailable.textContent = available
            statRented.textContent = rented
        }

        if (usersRes.success) {
            const customers = usersRes.data.filter(u => u.role === 'user').length
            statCustomers.textContent = customers
        }
    } catch (error) {
        console.error(error)
    }
}

logoutBtn?.addEventListener('click', async () => {
    await logoutUser()
    window.location.href = './login.html'
})