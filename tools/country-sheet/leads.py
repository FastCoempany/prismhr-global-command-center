# -*- coding: utf-8 -*-
"""The lead block for every country the sheet has data for.

The sixteen points are the same sixteen everywhere, and that is the problem the
founder named: read as a block they say nothing about THIS country. These lines
run above them and say what is specific here — the fact that makes running this
one in-house a project rather than a payroll entry. Each line traces to that
country's own bullets; nothing here is added from outside them.
"""
import json, io, os

LEAD = {}

# ---- the 60 with a published PrismHR guide -------------------------------

LEAD["Argentina"] = [
 "Employer contributions run about 26.4% of payroll, and healthcare is a separate 6% on top.",
 "Dismissal without cause costs a month's salary per year of service, priced off the highest month in the last year.",
 "Vacation is 14 days at the start and 35 days past twenty years — the entitlement keeps moving.",
]
LEAD["Australia"] = [
 "No single payroll tax to file: superannuation at 12%, then state payroll tax above each state's own threshold, then workers' compensation priced by industry.",
 "Every state is its own filing. One employee in two states is two registrations.",
 "Redundancy pay runs 4 to 16 weeks by service band.",
]
LEAD["Austria"] = [
 "Notice stretches to five months once an employee passes twenty-five years.",
 "Two severance systems run side by side depending on whether the employee started before or after 1 January 2003.",
 "Twenty-five working days of leave after six months, and collective agreements commonly add to it.",
]
LEAD["Barbados"] = [
 "Leave rises with service — three weeks at one year, more past five.",
 "Severance is a legal entitlement on redundancy once the continuous-service test is met.",
]
LEAD["Belgium"] = [
 "You cannot contract out of Belgian social security. An agreement that tries is void by law.",
 "Notice runs on seniority alone and is counted in weeks from the Monday after it is given.",
 "A dismissal indemnity in lieu of notice tops out near a year's pay under the 2026 cap.",
 "The employer pays the first week of maternity leave at full salary before the mutual fund takes over.",
]
LEAD["Belize"] = [
 "Notice reaches eight weeks past five years of service.",
 "Severance is a week's wages per completed year from five years of service.",
]
LEAD["Bolivia"] = [
 "There is no mandatory notice period at all, so the exit cost sits in severance.",
 "Employer contributions run about 17.2% across the health fund, professional risk, housing and a pension solidarity charge.",
 "Leave reaches 30 working days past ten years of service.",
]
LEAD["Brazil"] = [
 "Mandatory employer cost lands around 28% to 32%: INSS at 20%, work-accident insurance by risk class, Sistema S levies, and FGTS at 8% deposited monthly.",
 "A dismissal without cause pays a 40% penalty on the whole FGTS balance.",
 "Notice starts at 30 days and adds three days per year of service, to 90.",
 "Thirty days of leave, 120 days of maternity, and a private medical plan is expected in any competitive offer even though no law requires one.",
]
LEAD["British Virgin Islands"] = [
 "Enrolment in the National Health Insurance plan is compulsory for employees, the self-employed and their dependants.",
 "The National Provident Fund runs alongside social security and health, so three separate contributions leave every payroll.",
]
LEAD["Bulgaria"] = [
 "Maternity leave is 410 days.",
 "The employer must notify the National Revenue Agency within seven days of a termination taking effect.",
 "Severance runs one to seven months' pay depending on the ground for termination.",
]
LEAD["Canada"] = [
 "Employment standards are provincial. A team in three provinces is three sets of minimums.",
 "There is no statutory notice table that settles it — common-law reasonable notice sits on top of the statutory minimum and is what actually gets paid.",
 "Ontario and the federal jurisdiction add statutory severance on top of notice; the two are different entitlements.",
]
LEAD["Chile"] = [
 "Severance is a month's salary per year of service, capped at eleven years.",
 "Every employee must be affiliated to a health fund, public or private, and a private AFP for pension.",
 "The employer pays 2.4% unemployment insurance on indefinite contracts on top of the employee's own deduction.",
]
LEAD["China"] = [
 "Contribution rates are set city by city, not nationally. The same salary costs different amounts in Shanghai and Chengdu.",
 "Maternity leave is 98 days nationally and each province adds its own — 178 days in Guangdong, 190 in Henan.",
 "A housing provident fund runs alongside the five social insurances.",
]
LEAD["Colombia"] = [
 "Employer contributions are about 20.5% before the parafiscal levies to SENA, ICBF and the family compensation fund.",
 "Severance on a without-cause dismissal is 30 days for the first year plus 20 days for every year after.",
 "The employer pays maternity salary in full and claims it back from social security.",
]
LEAD["Costa Rica"] = [
 "The CCSS takes health and pension in one employer contribution, and it is a large share of payroll.",
 "Maternity leave is four months and the cost is split evenly with the CCSS.",
 "Unused vacation cannot be paid out — it has to be taken.",
]
LEAD["Czech Republic/Czechia"] = [
 "Employer load is 33.8%: 24.8% social security plus 9% health insurance.",
 "Social security stops at a yearly ceiling; health insurance has no cap at all.",
 "Notice runs from the first day of the month after it is delivered, and the minimum is two months.",
 "Maternity leave is 28 weeks, 37 for multiples.",
]
LEAD["Denmark"] = [
 "There is no general law giving a right to severance. What is owed comes from the collective agreement, and most sectors have one.",
 "Notice reaches six months for a long-serving employee.",
 "Five weeks of paid vacation, plus ATP, the maternity fund and industrial injuries insurance as separate employer charges.",
]
LEAD["Dominican Republic"] = [
 "Every severance payment must be made within ten days of the termination.",
 "Employer contributions split three ways: about 7.1% pension, 7.09% family health insurance, and a labour-risk premium.",
]
LEAD["Egypt"] = [
 "Notice is two months, and three months past ten years of service.",
 "The employer pays 25% of maternity salary and social security pays the other 75%.",
 "Leave rises to 30 days after ten years of service or once the employee turns fifty.",
]
LEAD["El Salvador"] = [
 "There is no statutory notice period, so the exit cost is all severance — 30 days per year of service.",
 "The employer pays 8.75% into a private AFP pension on top of the 7.5% health contribution to ISSS.",
 "Vacation pay carries a mandatory 30% bonus on top of regular salary.",
]
LEAD["Finland"] = [
 "Employer contributions run about 20.8%, dominated by the TyEL earnings-related pension.",
 "Terms are set by the sector's collective agreement, and notice periods sit in it as well as in law.",
 "Leave accrues per month and lands between 24 and 30 days depending on service.",
]
LEAD["France"] = [
 "Employer contributions are roughly 45% of gross, and the mutuelle health top-up is compulsory on top of that.",
 "Five weeks of paid leave, and the sector's collective agreement usually adds to the statutory floor.",
 "Maternity leave stretches to 34 weeks for twins and 46 for triplets.",
]
LEAD["Germany"] = [
 "Statutory notice steps out to seven months for a long-serving employee, and it always ends on a fixed calendar date rather than a rolling one.",
 "Four separate insurances — health, pension, long-term care, unemployment — each with its own contribution ceiling.",
 "Above the income threshold an employee can leave statutory health insurance for a private plan, and the employer's obligation changes with them.",
]
LEAD["Greece"] = [
 "Severance is paid in whole gross salaries by service band — two at one to four years, four at six to eight.",
 "The employer pays the first month of maternity leave at full salary, then half from the second month.",
]
LEAD["Guatemala"] = [
 "The employer pays about 12.67% to IGSS plus roughly 1% each to IRTRA for recreation and INTECAP for training — three separate destinations.",
 "An employee has 30 days to file a dismissal claim in labour court, and the burden of justifying it sits with the employer.",
]
LEAD["Honduras"] = [
 "Three separate employer contributions: IHSS for health and pension, RAP for the private pension scheme, and INFOP for vocational training. INFOP has no salary ceiling.",
 "Leave climbs from 10 days at one year to 20 days at four.",
]
LEAD["Hungary"] = [
 "Leave rises with age as well as service: an extra day from 25 and ten extra days from 45.",
 "Maternity and childcare leave can run to three years, with the job protected across it.",
 "Notice grows by service band and severance runs from one month at three years to six months past twenty-five.",
]
LEAD["India"] = [
 "State rules sit on top of the central ones — professional tax, shops and establishments registration, leave entitlements all vary by state.",
 "Provident fund at 12% employer, ESI health cover for lower-paid workers, and gratuity accruing separately.",
 "Maternity leave is 26 weeks for the first two children.",
 "Retrenchment compensation is 15 days' average pay per year of service for anyone classed as a workman.",
]
LEAD["Indonesia"] = [
 "Severance is mandatory on almost every termination and reaches nine months' wages past eight years of service.",
 "Two BPJS programmes run in parallel: health, and employment covering pension, old age, death and work accident.",
 "Maternity leave is three months before the due date and six weeks after, all at full pay.",
]
LEAD["Ireland"] = [
 "Statutory redundancy needs two years of service and is calculated in weeks per year of service plus a bonus week.",
 "Employer PRSI is about 11.25% above the lower threshold.",
 "Maternity leave is 26 weeks paid plus 16 weeks unpaid, and the paid part depends on the employee's own contribution record.",
]
LEAD["Israel"] = [
 "National insurance at about 7.6% is only part of it: mandatory pension at about 6.5% and a severance component at 8.33% are funded monthly on top.",
 "The severance component is funded monthly while the employment runs, and reaches a month's salary per year.",
 "Notice for a monthly-paid employee is built up day by day through the first year.",
]
LEAD["Italy"] = [
 "About 8.33% of gross accrues to TFR every year and is paid to everyone who leaves, resignation included.",
 "There is no statutory notice table. The sector's national collective agreement sets it by job classification and seniority, and there are hundreds of those agreements.",
 "Employer contributions to INPS run about 30% of gross before TFR.",
]
LEAD["Jamaica"] = [
 "Four separate employer charges in one payroll: NIS, education tax, the HEART training levy and the NHT housing contribution.",
 "Redundancy pay is two weeks per year for the first ten years and three weeks per year after that.",
]
LEAD["Japan"] = [
 "Employees' pension insurance is employer-matched at 9.15% each side, charged on bonuses as well as salary.",
 "Annual leave is set by service and any unused day expires after two years.",
 "No statutory severance — but dismissal itself is hard: it must be objectively reasonable and socially acceptable, or it is void.",
]
LEAD["Kenya"] = [
 "Twenty-one working days of leave, and eligibility now starts in the seventh month of employment.",
 "NSSF for retirement and the national health fund both take mandatory contributions.",
 "Redundancy pay is 15 days' basic pay per completed year, and service pay may be owed on other exits.",
]
LEAD["Malaysia"] = [
 "Employer contributions are about 13% to EPF plus SOCSO and the employment insurance system.",
 "Notice reaches eight weeks past five years of service.",
 "Severance runs 10 to 20 days per year of service by band, and it is mandatory.",
]
LEAD["Mexico"] = [
 "The headline social security rate misleads: employer cost lands around 30% to 40% because it is charged on the integrated wage, not base salary — IMSS, INFONAVIT housing at 5%, SAR retirement and a state payroll tax on top.",
 "Severance without cause is three months of integrated salary plus 20 days per year, and the integrated salary is a bigger number than the base.",
 "Profit sharing is a legal obligation for a profitable employer, capped at three months' salary.",
 "Vacation doubled in 2023 and now starts at 12 days.",
]
LEAD["Netherlands"] = [
 "A sector pension fund can be compulsory for your industry whether or not you chose it.",
 "The transition payment is owed on every employer-initiated exit — a third of a month's salary per year of service — including the end of a fixed-term contract.",
 "Notice reaches four months past fifteen years.",
]
LEAD["New Zealand"] = [
 "No severance pay is required at all, so an exit turns on whether the process was followed.",
 "KiwiSaver at 3% for enrolled employees, plus an ACC work levy priced by industry risk.",
 "Parental leave is government-funded for 26 weeks and the employee can take 52 weeks in total.",
]
LEAD["Nicaragua"] = [
 "INSS takes 21.5% to 22.5% of payroll from the employer, and the rate moves with headcount.",
 "Leave doubles at one year, from 15 days to 30.",
 "Severance is a month's salary per year for the first three years and continues past that.",
]
LEAD["Panama"] = [
 "Thirty calendar days of paid leave after a year, accruing from the start.",
 "Severance has two parts — the seniority bonus and the indemnity — and both are owed on a dismissal without just cause.",
]
LEAD["Paraguay"] = [
 "Notice reaches 60 days past five years and longer beyond ten.",
 "Maternity leave is 18 weeks fully paid, with six more available.",
]
LEAD["Peru"] = [
 "Thirty calendar days of paid leave after one year.",
 "There is no general severance, but an unfair dismissal is compensated at a formula set by law, so the exposure sits in whether the ground for dismissal holds.",
 "The employer pays 9% to EsSalud for health; the pension contribution is withheld from the employee and goes to a private fund.",
]
LEAD["Philippines"] = [
 "Payroll is semi-monthly by law, not monthly.",
 "A dismissal for an authorised cause needs 30 days' written notice to the employee and a copy filed to the Department of Labor.",
 "Separation pay is owed on authorised-cause dismissals whatever the length of service.",
 "Maternity leave is 105 days, with 15 more for a solo parent.",
]
LEAD["Poland"] = [
 "Leave counts education as service: a university degree adds eight years to the calculation, so a new graduate can land straight on 26 days.",
 "Severance on redundancy is mandatory only for employers above twenty employees.",
 "Maternity leave is 20 weeks paid by ZUS at 100%, up to 37 weeks for multiples.",
]
LEAD["Portugal"] = [
 "Employer social security is 23.75% of gross, with a work-compensation fund contribution on top.",
 "The holiday subsidy and the Christmas subsidy are legal entitlements, so a year is fourteen months of pay.",
 "Notice scales to 75 days past ten years of service.",
]
LEAD["Puerto Rico"] = [
 "Two bodies of law apply at once — US federal statutes and Puerto Rico's own code — and where they differ the more generous one governs.",
 "The Christmas bonus is statutory: 2% of wages earned to a 600 dollar cap at 21 or more employees, 300 below that, paid between 15 November and 15 December.",
 "Overtime runs on the calendar day as well as the week, at time and a half past eight hours in a day.",
 "The meal period has to start between the third and the sixth hour, and work through it is paid at time and a half on top of any overtime owed.",
 "Unjust dismissal carries the mesada: three months' salary plus two weeks per year of service for anyone hired since 26 January 2017.",
 "Three registrations before anyone is paid — Hacienda for income tax, the Department of Labor for unemployment and SINOT disability, and the State Insurance Fund for workers' compensation, which is a government monopoly you cannot buy around.",
 "Act 4-2017 split the workforce by hire date: vacation accrual, sick leave and the mesada all differ for anyone hired before 26 January 2017.",
]
LEAD["Romania"] = [
 "The burden sits on the employee — 25% social insurance and 10% health — with the employer paying a 2.25% work insurance contribution.",
 "Notice on an employer dismissal is 20 working days whatever the employee's seniority or role.",
 "No statutory severance; what is owed comes from the collective agreement or the contract.",
]
LEAD["Serbia"] = [
 "Maternity leave is 365 days for a first or second child.",
 "Severance is mandatory only for redundancy, and the formula is set in law.",
]
LEAD["Singapore"] = [
 "CPF at up to 17% applies only to citizens and permanent residents. A foreign employee is outside it entirely, so the headline rate misprices most international hires.",
 "Every foreign employee needs a work pass, and the pass type carries its own salary floor and quota.",
 "Notice starts at one day for under 26 weeks of service.",
]
LEAD["South Africa"] = [
 "Statutory payroll charges are light — 1% UIF and a 1% skills levy — but a bargaining council agreement in your sector can bind you to terms you never signed.",
 "Maternity leave is four consecutive months and the employer is not obliged to pay it; the employee claims UIF at about 66%.",
 "Twenty-one consecutive days of leave, accruing at 1.25 days a month.",
]
LEAD["South Korea"] = [
 "Four insurances, all employer-matched, and the rates reset each January.",
 "Severance is owed to everyone with a year of service whatever the reason for leaving, at a month's pay per year, so it accrues on every employee from year one.",
 "Thirty days' notice is required before terminating an employee past the initial period.",
]
LEAD["Spain"] = [
 "Employer social security is about 30.65% of gross, and contribution ceilings apply.",
 "Severance splits by whether the dismissal is fair: 20 days per year capped at twelve months for an objective dismissal, 33 days per year capped at 24 months if a court finds it unfair.",
 "Notice is only 15 days, so the cost is concentrated entirely in the severance calculation.",
]
LEAD["Sweden"] = [
 "There is no statutory severance at all, but the collective agreement usually supplies one, and the ITP pension plan is standard for white-collar staff.",
 "Twenty-five days of leave by law and 30 in common practice, on an April-to-March accrual year.",
]
LEAD["Switzerland"] = [
 "The 6.4% headline is only the first pillar. The mandatory second-pillar occupational pension (BVG) is charged on top and rises with the employee's age.",
 "Health insurance is compulsory and the individual buys it themselves, so the salary has to carry the premium.",
 "Terms differ by canton, and some cantons set their own minimum wage.",
]
LEAD["Thailand"] = [
 "Severance runs from 30 days to 400 days of wages by length of service.",
 "Statutory annual leave is only 6 days, so what a competitive offer looks like has nothing to do with the legal floor.",
 "Maternity leave is 98 days, paid at 100% for the first 45 by social security and 50% after.",
]
LEAD["Turkey"] = [
 "Severance is owed on most qualifying exits, including resignation after a year in defined cases, at a month's pay per year against a statutory ceiling.",
 "Employer SGK contributions are about 20.75%, reducible by roughly five points if the incentive conditions are met — and those conditions have to be maintained.",
 "Notice runs from two to eight weeks by service band.",
]
LEAD["UAE"] = [
 "No social security for expatriate employees, and most of the workforce is expatriate, so the end-of-service gratuity is the only statutory employer cost.",
 "Medical insurance is mandatory for the employer to provide, and a residence visa will not issue without it.",
 "The free zones run their own employment laws. DIFC and ADGM notice rules are not the onshore rules.",
]
LEAD["United Kingdom"] = [
 "Pension auto-enrolment is compulsory, with an employer minimum and a duty to re-enrol every three years.",
 "Statutory redundancy needs two years of service and is calculated by age band as well as service.",
 "Maternity leave is 52 weeks, and the job is protected across it.",
 "5.6 weeks of leave, and whether bank holidays count inside that total is a contract term.",
]
LEAD["United States"] = [
 "Employment law is state by state — at-will everywhere except Montana, but leave, final-pay timing and non-compete rules all differ.",
 "No statutory paid maternity leave; FMLA gives 12 weeks unpaid, and several states run their own paid schemes on top.",
 "The ACA employer mandate attaches at 50 full-time-equivalent employees.",
]
LEAD["Uruguay"] = [
 "Severance is a month's salary per year of service, or fraction, on a dismissal without just cause.",
 "BPS employer contributions are about 12.6% across pension, FONASA health, the reconversion fund and the wage guarantee fund.",
]

# ---- the 35 written from public sources ----------------------------------

LEAD["Vietnam"] = [
 "Minimum wage is regional, not national — four regions, four floors, and the region is set by where the work happens.",
 "Employer social insurance is 17.5% plus 3% health and 1% unemployment, and the unemployment piece covers Vietnamese nationals only.",
 "Maternity leave is six months.",
 "A 13th-month Tet bonus is not law but is expected, and an offer without it is not competitive.",
]
LEAD["Saudi Arabia"] = [
 "GOSI splits by nationality: 2% employer for an expatriate, 21.5% in total for a Saudi national. Which passport the hire holds changes the cost outright.",
 "Saudization quotas govern whether you can hire an expatriate at all, and the Nitaqat band controls visa renewals and iqama issuance.",
 "Private medical cover is compulsory for the employee and their dependants, and the residence permit will not renew without it.",
 "Wages must run through the Mudad wage protection system to count as paid.",
]
LEAD["Norway"] = [
 "No statutory minimum wage — but in construction, cleaning, hospitality and other sectors the collective agreement's pay floor is declared universally binding on every employer.",
 "The employer pays full salary for the first 16 calendar days of every sickness absence.",
 "Holiday pay is a separate 10.2% of the prior year's earnings, on top of the 25 days of leave.",
 "There is no statutory severance, but a dismissed employee who disputes it can demand to stay in the job on full pay while the case runs.",
]
LEAD["Hong Kong"] = [
 "There is no statutory limit on working hours and no statutory overtime premium, so the contract sets both.",
 "MPF is capped: 5% up to 30,000 HKD a month. But an employee earning under 7,100 contributes nothing while the employer still pays its 5%.",
 "Long service payment mirrors severance, so a non-redundancy exit after five years still carries a statutory cost.",
 "Statutory holidays are on a legislated climb from 12 to 17 by 2030, so the number moves year to year.",
]
LEAD["Taiwan"] = [
 "The labor pension program excludes foreign nationals, so the employer cost differs by who is hired.",
 "A 2.11% supplementary health premium falls on bonuses above four times the monthly insured salary, and the employer matches it.",
 "Annual leave is seniority-tied and reaches 30 days after ten years.",
]
LEAD["Nigeria"] = [
 "The contributory pension scheme is mandatory only at 15 or more employees — but at that headcount it is 10% employer, and the employer may be asked to carry the whole 20%.",
 "Statutory leave is six days a year. The legal floor is nowhere near what a hire will accept, so the contract does all the work.",
 "There is no statutory severance. What is owed comes from the contract and the handbook, and the National Industrial Court enforces those terms.",
]
LEAD["Pakistan"] = [
 "Labour law is provincial. Punjab, Sindh, KP and Balochistan each have their own minimum wage, social security institution and rates.",
 "Maternity leave is 180 days for a first birth.",
 "Gratuity is 30 days' wages per year of service unless a provident fund replaces it.",
]
LEAD["Ukraine"] = [
 "Payroll must run twice a month, no more than sixteen days apart. A monthly cycle is not compliant.",
 "The 22% unified social contribution is employer-only and capped at fifteen times the minimum wage.",
 "Martial-law rules let an employer change terms on two months' notice without consent, and they change as the law is amended.",
 "The employer pays the first five days of every sick absence in full.",
]
LEAD["Bangladesh"] = [
 "No national social security scheme. Instead a company above the capital threshold pays 5% of net profit into the Workers' Profit Participation Fund every year.",
 "Notice for a monthly-paid permanent worker is 120 days.",
 "A provident fund becomes compulsory only when three quarters of the workforce demand one in writing.",
 "A festival bonus of a month's basic salary is expected annually.",
]
LEAD["Morocco"] = [
 "CNSS employer contributions are about 21.09%, and the pieces cap differently: family allocation and medical care are uncapped, social allocation stops at 6,000 MAD.",
 "Dismissal indemnity is priced in hours of salary per year of service, rising in four bands to 240 hours a year past fifteen.",
 "Notice runs one to three months by category and service.",
]
LEAD["Sri Lanka"] = [
 "EPF at 12% and ETF at 3% are both employer charges — 15% of gross before anything else.",
 "An employer with 15 or more employees cannot dismiss a worker of one year's service without the worker's written consent or the Commissioner of Labour's prior approval.",
 "Public holidays include the monthly full-moon Poya days, which move on a lunar cycle.",
]
LEAD["Ghana"] = [
 "VAT is 15% but three levies ride on top, so the real consumption charge lands near 25%.",
 "SSNIT is 13% employer across two mandatory tiers.",
 "Redundancy pay is negotiated with the worker or the union, and where they cannot agree the Chief Labour Officer sets it.",
]
LEAD["Ecuador"] = [
 "Four separate obligations beyond salary: a thirteenth salary in December, a fourteenth in August or April by region, a reserve fund of 8.33% from year two, and 15% of company profits distributed to employees.",
 "Those add roughly 20% to 30% on top of gross pay.",
 "IESS employer contribution is 12.15% with no ceiling.",
 "Dismissal without cause pays a month per year of service with a three-month floor, plus a further 25% of the last salary per year.",
]
LEAD["Slovakia"] = [
 "Employer contributions run about 36.2% across eight separate funds.",
 "The employer pays the first ten days of every sickness absence.",
 "Severance reaches four months' average earnings past twenty years of service.",
]
LEAD["Slovenia"] = [
 "The holiday allowance (regres) is a mandatory annual payment of at least the national minimum wage, owed whether or not the leave is taken.",
 "The employer pays the first 20 working days of every sickness absence.",
 "Leave rises above the 20-day floor for age, seniority, disability and dependent children.",
]
LEAD["Croatia"] = [
 "The employer's charge is health insurance at 16.5%. Pension, 20% across both pillars, comes out of the employee, so health insurance is the whole employer line.",
 "The employer pays the first 42 days of every sick absence at 70% of salary.",
 "Carried-over leave has to be used by 30 June of the following year.",
]
LEAD["Estonia"] = [
 "Social tax is 33% of gross, employer-only, with no ceiling.",
 "Redundancy costs a month's average pay, plus a further month from the unemployment fund at five years of service and two more past ten.",
 "Twenty-eight calendar days of leave.",
]
LEAD["Latvia"] = [
 "Payroll must run at least twice a month unless the employee agrees in writing to monthly.",
 "The employer pays days two to ten of every sickness absence — 75% for days two and three, 80% after.",
 "Severance reaches four months' average earnings past twenty years.",
]
LEAD["Lithuania"] = [
 "The employer rate is 1.77% because Lithuania moved the contributions onto the employee and grossed salaries up to match, so a salary quoted here is not comparable to one quoted next door.",
 "The employer pays the first two days of every sickness absence.",
 "Severance is two months' average pay for anyone between one and twenty years of service.",
]
LEAD["Cyprus"] = [
 "Five separate employer funds in one payroll — social insurance, national health, social cohesion, redundancy and training — with three different ceilings between them.",
 "Redundancy pay comes out of the state fund the employer has been paying 1.2% into, not out of the employer's pocket at the exit.",
 "Probation can be written out to two years.",
]
LEAD["Malta"] = [
 "Four statutory government bonuses a year, paid by the employer in March, June, September and December.",
 "The leave entitlement is recalculated every year for public holidays falling on a weekend, so the number moves annually.",
 "No statutory redundancy pay — but a redundant employee has the right to be reinstated if the post is refilled within twelve months.",
]
LEAD["Luxembourg"] = [
 "The statutory minimum wage has two levels: one for unskilled work and one about 20% higher for a qualified employee.",
 "The employer pays full salary to the end of the month containing the 77th day of sickness, then recovers most of it from the employers' mutual scheme.",
 "Severance reaches twelve months' pay past thirty years of service.",
 "Notice doubles when the employer is the one ending it.",
]
LEAD["Iceland"] = [
 "No statutory minimum wage. Sectoral collective agreements set pay, hours, overtime and bonuses, and they bind every employer in the sector whether the employee is a union member or not.",
 "Pension is at least 11.5% employer, with union and rehabilitation fund contributions alongside.",
 "The December bonus and holiday bonus are collective-agreement entitlements, not discretionary extras.",
]
LEAD["Qatar"] = [
 "No social insurance for expatriates and no pension, so the end-of-service gratuity is the only statutory employer cost.",
 "Wages must be paid through the Wage Protection System within seven days of the period ending.",
 "Employer-provided health insurance is a condition of the residence permit.",
 "Working hours drop to six a day during Ramadan.",
]
LEAD["Kuwait"] = [
 "Social security applies to Kuwaiti nationals only. An expatriate employee carries no social insurance charge at all.",
 "Thirty working days of annual leave.",
 "Notice for a monthly-paid worker is three months.",
 "End-of-service indemnity caps at a year and a half's pay.",
]
LEAD["Bahrain"] = [
 "Social insurance splits by nationality — 12% employer for a Bahraini, 3% for an expatriate — plus a monthly labour market authority fee per expatriate.",
 "Thirty days of annual leave and 55 days of sick leave.",
 "An employee outside social insurance is owed a leaving indemnity instead, at half a month per year for three years then a full month a year.",
]
LEAD["Oman"] = [
 "The 2023 law rewrote the expatriate gratuity upward — a full month's basic salary per year from year one, replacing the old 15-day formula. Service straddling the change is calculated in two parts.",
 "A mandatory savings scheme for expatriates now takes about 9% of salary monthly.",
 "Sick leave went from 70 days to 182, and maternity from 50 days to 98, in the same reform.",
 "The working week dropped from 45 hours to 40.",
]
LEAD["Jordan"] = [
 "Social security is 14.25% employer and covers old age, disability, death, maternity, unemployment and work injury.",
 "Severance is half a month per year with a two-month floor, plus 30 days' pay where no notice was given.",
 "Maternity leave was extended to 90 days in the 2024 amendment.",
]
LEAD["Bahamas"] = [
 "Severance caps differ by grade: 24 weeks for a non-supervisory employee, 48 weeks for a supervisor or manager.",
 "National Insurance is 6.65% employer on insurable wages up to a weekly ceiling.",
 "Two weeks of vacation, three after seven years.",
]
LEAD["Trinidad and Tobago"] = [
 "National Insurance is charged in weekly earnings classes, not as a percentage — the employer pays two thirds of the class contribution.",
 "A retrenchment needs 45 days' written notice to the employee and to the Minister before it can take effect.",
 "Maternity leave is 14 weeks, with one month at full pay and two at half pay from the employer.",
]
LEAD["Bermuda"] = [
 "Payroll tax is the main employer charge at 10.25% for an exempted undertaking, and the band depends on payroll size and sector.",
 "Health insurance is compulsory: the employer must cover every employee and any non-employed spouse, is liable for the whole premium, and may recover only half.",
 "Occupational pension at 5% employer is compulsory for Bermudian employees and their spouses aged 23 to 65.",
 "Statutory vacation is two weeks after the first year, with no accrual above that.",
]
LEAD["Cayman Islands"] = [
 "No income tax, no payroll tax and no social security — but pension at 5% and health insurance at half the premium are both compulsory and both bought from private providers.",
 "Health cover must be in place from the first day of employment.",
 "Vacation climbs from two weeks to four after ten years.",
]
LEAD["Kazakstan"] = [
 "Five separate employer-side charges: social tax, social insurance, medical insurance, and a mandatory employer pension contribution phased in from 2024, each on its own base.",
 "Sick pay is the employer's, capped monthly against the monthly calculation index.",
 "Twenty-four calendar days of leave and 16 public holidays.",
]
LEAD["Georgia"] = [
 "There is no employer social security, unemployment or workers' compensation charge. The only mandatory contribution is 2% into the funded pension.",
 "The statutory minimum wage has not been revised since 1999 and is effectively symbolic — the market sets pay.",
 "There is no statutory paid sick leave.",
 "Termination is 30 days' notice with a month's pay, or 3 days' notice with two months' pay — the choice is the employer's.",
]
LEAD["Mauritius"] = [
 "Severance on an unjustified termination is three months' remuneration per year of service.",
 "The Portable Retirement Gratuity Fund is a monthly filing to the Revenue Authority, and the gratuity follows the worker between employers rather than sitting on the employer's books.",
 "Three employer charges beyond salary: CSG, the National Savings Fund and a training levy.",
]

p = os.path.dirname(os.path.abspath(__file__))
with io.open(os.path.join(p, "leads.json"), "w", encoding="utf-8") as f:
    json.dump(LEAD, f, ensure_ascii=False, indent=1)
print("countries with a lead:", len(LEAD), "lines:", sum(len(v) for v in LEAD.values()))
