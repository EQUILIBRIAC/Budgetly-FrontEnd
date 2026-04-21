export class HouseholdSummary {
    constructor({
                    totalContributed = 0,
                    monthlyGoal = 0,
                    progress = 0,
                    contributors = 0,
                    currency = 'PEN'
                } = {}) {
        this.totalContributed = Number(totalContributed || 0);
        this.monthlyGoal = Number(monthlyGoal || 0);
        this.progress = Number(progress || 0);
        this.contributors = Number(contributors || 0);
        this.currency = currency;
    }

    get hasGoal() {
        return this.monthlyGoal > 0;
    }

    computeProgress() {
        if (!this.hasGoal) return 0;
        return Number(((this.totalContributed / this.monthlyGoal) * 100).toFixed(2));
    }

    formatMoney(n) {
        const locale = this.currency === 'USD' ? 'en-US' : 'es-PE';
        return new Intl.NumberFormat(locale, { style: 'currency', currency: this.currency }).format(n || 0);
    }
}