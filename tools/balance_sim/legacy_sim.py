"""Нүүдэлчин — эдийн засаг ба малын өсөлтийн Монте-Карло загвар.
Прототипын (v1.2) томьёог хуулбарлаж, тоглогчийн ухаалаг стратегиар олон жил тоглуулна.
"""
import random, statistics, math, sys

SEASON_DAYS = 6
YEAR_DAYS = 24

AGE = {
    'sheep': dict(adult=4, old=8, death=10, base=150_000, birth=0.85),
    'cow':   dict(adult=4, old=9, death=12, base=1_200_000, birth=0.75),
}

def price(a, P):
    t = AGE[a['t']]
    y = a['y']
    if y < t['adult']:
        m = [0.35, 0.55, 0.75, 0.9][y]
    elif y < t['old']:
        m = 1.0
        if a['t'] == 'cow' and a['s'] == 'm':
            m *= 1.1
    else:
        m = max(0.2, 0.6 - 0.15 * (y - t['old']))
    # тарга хүч: бэлчээр муу бол үнэ буурна (санал)
    return t['base'] * P['price_mult'] * m * a.get('cond', 1.0)

def units_proto(an):
    u = 0
    for a in an:
        if a['t'] == 'sheep':
            u += 0.5 if a['y'] == 0 else 1
        else:
            u += 2 if a['y'] == 0 else 4
    return u

def sheep_units(an):
    """Хонин толгой: хонь 1, үхэр 6 (төл тал хувь)."""
    u = 0
    for a in an:
        k = 1 if a['t'] == 'sheep' else 6
        u += k * (0.5 if a['y'] == 0 else 1)
    return u

def start_herd():
    an = [dict(t='sheep', s='m', y=4)]
    for y in [1, 2, 2, 3, 4, 5, 5, 6, 7]:
        an.append(dict(t='sheep', s='f', y=y))
    an += [dict(t='cow', s='f', y=5), dict(t='cow', s='f', y=6)]
    return an

def run(P, policy, skill_loss, seed, max_years=8):
    rnd = random.Random(seed)
    an = start_herd()
    money = P['start_money']
    food = 6.0
    tier = 0
    grass = [88, 100, 100, 100]
    hist = []
    lactating = set()  # энэ жил тугалласан үнээ (P['milk_needs_calf'])
    for a in an:
        if a['t'] == 'cow':
            lactating.add(id(a))
    ger_day = None
    min_money = money
    hay_short = 0
    for day in range(1, max_years * YEAR_DAYS + 1):
        d0 = day - 1
        year = d0 // YEAR_DAYS
        season = (d0 % YEAR_DAYS) // SEASON_DAYS
        sday = d0 % SEASON_DAYS + 1
        camp = season  # цагтаа нүүнэ
        # --- улирлын эхэнд: нүүдэл, шинэ жил
        if sday == 1:
            if d0 > 0:
                money -= P['migrate']
            if season == 0 and d0 > 0:
                # нас нэмэх, үхэх
                for a in an[:]:
                    a['y'] += 1
                    if a['y'] >= AGE[a['t']]['death']:
                        an.remove(a)
                lactating.clear()
        # --- төллөлт (хаврын 3 дахь өдөр)
        if season == 0 and sday == 3:
            newborn = []
            for a in an:
                if a['s'] == 'f' and a['y'] >= P['breed_age'][a['t']]:
                    if rnd.random() < AGE[a['t']]['birth'] * P['birth_mult']:
                        newborn.append(dict(t=a['t'], s=rnd.choice('mf'), y=0))
                        if a['t'] == 'cow':
                            lactating.add(id(a))
            an += newborn
        # --- сүү
        g = grass[camp]
        gf = 0.5 + 0.5 * min(g / 60, 1)
        milk_l = 0.0
        for a in an:
            if a['t'] == 'cow' and a['s'] == 'f' and a['y'] >= 2:
                if P['milk_needs_calf'] and id(a) not in lactating:
                    continue
                milk_l += P['milk'][season] * gf
        # хүнс: сүүтэй цай (3 л = 1 хоног) — өдөрт ихдээ 1 л биш, хэрэгтэй хэмжээг
        tea_need = max(0, min(3 * P['tea_share'], milk_l))
        food += tea_need / 3
        milk_l -= tea_need
        # тоног төхөөрөмж
        per_l = [P['milk_price'], 14000 / 4, 22000 / 4][tier]
        money += milk_l * per_l * P['price_mult']
        # --- хоол
        food -= 1
        food_cost = P['daily_cash_cost'] * P['price_mult']
        money -= food_cost
        if food < 0:
            # гаргах: эхлээд хөгшин, дараа нь эр, эцэст нь хамгийн бага үнэтэй
            cand = sorted([a for a in an if a['t'] == 'sheep' and not (a['s'] == 'm' and a['y'] >= 4 and sum(1 for b in an if b['t']=='sheep' and b['s']=='m' and b['y']>=1) <= 1)],
                          key=lambda a: (a['y'] < AGE['sheep']['old'], a['s'] == 'f', price(a, P)))
            if cand:
                an.remove(cand[0])
                food += 8
            else:
                food = 0
        # --- бэлчээр
        u = units_proto(an) if P['grass_units'] == 'proto' else sheep_units(an)
        use = u * P['graze']
        regrow = 0 if season == 3 else P['regrow']
        for i in range(4):
            if i == camp:
                grass[i] = min(100, max(0, grass[i] - use + regrow))
            elif season != 3:
                grass[i] = min(100, grass[i] + P['rest_regrow'])
        # бэлчээр муу бол (санал) тарга хүч буурна
        if P['overgraze']:
            for a in an:
                c = a.get('cond', 1.0)
                if grass[camp] < 25:
                    c -= 0.02
                elif grass[camp] > 50:
                    c += 0.01
                a['cond'] = min(1.0, max(0.5, c))
        # --- өвөл: өвс тэжээл
        if season == 3:
            need = math.ceil(units_proto(an) / P['hay_div'])
            cost = need * P['hay_price'] * P['price_mult']
            money -= cost
            if P['overgraze']:
                # туранхай мал өвөлдөө хорогдох эрсдэлтэй
                for a in an[:]:
                    if a.get('cond', 1) < 0.7 and rnd.random() < 0.02:
                        an.remove(a)
        # --- чоно / төөрөлт (тоглогчийн ур чадвар)
        p_day = skill_loss / YEAR_DAYS
        for a in an[:]:
            if rnd.random() < p_day:
                an.remove(a)
        # --- тоглогчийн бодлого (өдөр бүр шалгана)
        money, tier, bought = policy(an, money, tier, season, sday, P, rnd)
        min_money = min(min_money, money)
        if bought and ger_day is None:
            ger_day = day
            break
        if not an:
            break
        if season == 3 and sday == 6:
            hist.append((year + 1, len([a for a in an if a['t']=='sheep']), len([a for a in an if a['t']=='cow']), round(sheep_units(an)), round(money)))
    return dict(ger_day=ger_day, hist=hist, min_money=min_money, herd=sheep_units(an), money=money)


def make_policy(ger_price, herd_goal=0, reserve=0.0, liquidate=False, keep_ewes=True, buy_tools=True):
    def policy(an, money, tier, season, sday, P, rnd):
        bought = False
        if liquidate:
            # бүх үхэр, хонийг зарж шууд гэр авна
            total = money + sum(price(a, P) for a in an if a['t'] == 'cow')
            if total >= ger_price * P['price_mult']:
                return total - ger_price * P['price_mult'], tier, True
        # намрын эхэнд: илүүдэл эрийг зарна (1 эрэг хонь, 1 бух хэрэгтэй гэж үзэхгүй)
        if season == 2 and sday == 1:
            rams = [a for a in an if a['t'] == 'sheep' and a['s'] == 'm']
            rams.sort(key=lambda a: -a['y'])
            keep = rams[:2] if len([a for a in an if a['t']=='sheep' and a['s']=='f']) > 25 else rams[:1]
            for a in rams:
                if a not in keep and a['y'] >= 1:
                    money += price(a, P); an.remove(a)
            for a in [a for a in an if a['t'] == 'cow' and a['s'] == 'm' and a['y'] >= 2]:
                money += price(a, P); an.remove(a)
            # хөгшин эм мал
            for a in [a for a in an if a['y'] >= AGE[a['t']]['old'] and a['s'] == 'f' and a['t']=='sheep']:
                money += price(a, P); an.remove(a)
        # өвлийн өмнө мөнгө дутвал эм мал зарна
        winter_need = 6 * math.ceil(units_proto(an) / P['hay_div']) * P['hay_price'] * P['price_mult'] + P['migrate'] * 2
        if money < 0 or (season == 2 and sday == 6 and money < winter_need):
            pool = sorted([a for a in an if a['t'] == 'sheep'], key=lambda a: (a['s'] == 'f', -a['y']))
            while (money < 0 or (season == 2 and sday == 6 and money < winter_need)) and pool:
                a = pool.pop(0); money += price(a, P); an.remove(a)
        # тоног төхөөрөмж
        if buy_tools:
            if tier == 0 and money > (120_000 + reserve) * P['price_mult']:
                money -= 120_000 * P['price_mult']; tier = 1
            elif tier == 1 and money > (650_000 + reserve + 300_000) * P['price_mult']:
                money -= 650_000 * P['price_mult']; tier = 2
        # гэр: мөнгө хүрсэн, сүрэг зорилтод хүрсэн бол
        if money >= (ger_price + reserve) * P['price_mult'] and sheep_units(an) >= herd_goal:
            money -= ger_price * P['price_mult']; bought = True
        elif herd_goal and sheep_units(an) >= herd_goal * 1.25 and money < (ger_price + reserve) * P['price_mult']:
            # сүрэг хангалттай том бол илүүдлийг зарж гэрийн мөнгө цуглуулна
            pool = sorted([a for a in an if a['t'] == 'sheep' and a['y'] >= 1], key=lambda a: (a['s'] == 'f', -a['y']))
            while pool and sheep_units(an) > herd_goal * 1.05 and money < (ger_price + reserve) * P['price_mult']:
                a = pool.pop(0); money += price(a, P); an.remove(a)
        return money, tier, bought
    return policy

PROTO = dict(start_money=60_000, migrate=80_000, milk=[3, 5, 3, 0.5], milk_price=2000, price_mult=1.0,
             breed_age={'sheep': 1, 'cow': 1}, birth_mult=1.0, milk_needs_calf=False, tea_share=0.0,
             daily_cash_cost=0, grass_units='proto', graze=0.35, regrow=2.5, rest_regrow=6,
             overgraze=False, hay_div=8, hay_price=10_000)

def summarize(name, P, policy, skill_loss, n=300, years=8):
    res = [run(P, policy, skill_loss, s, years) for s in range(n)]
    days = [r['ger_day'] for r in res if r['ger_day']]
    pct = len(days) / n
    if days:
        med = statistics.median(days); q1 = sorted(days)[len(days)//10]; q9 = sorted(days)[min(len(days)-1, len(days)*9//10)]
        hours = med * 4 / 60
        print(f"{name:52s} гэр авсан {pct*100:5.1f}% | медиан {med/YEAR_DAYS:4.2f} жил ({hours:4.1f} ц @1×) | 10–90%: {q1/YEAR_DAYS:.2f}–{q9/YEAR_DAYS:.2f} жил")
    else:
        print(f"{name:52s} гэр авсан   0.0%")
    return res

if __name__ == '__main__':
    print('=== ОДООГИЙН ДҮРЭМ (прототип v1.2) ===')
    summarize('А. Эхний өдөр үхрээ зарж гэр авах', PROTO, make_policy(2_000_000, liquidate=True), 0.07)
    for loss, nm in [(0.03, 'сайн'), (0.07, 'дунд'), (0.15, 'муу')]:
        summarize(f'Б. Шударга тоглолт, 2 сая ₮, тоглогч {nm}', PROTO, make_policy(2_000_000), loss)
    # өсөлтийн түүх
    r = run(PROTO, make_policy(10**12), 0.07, 1, 6)
    print('\nГэр авахгүйгээр зөвхөн өсгөвөл (дунд тоглогч, нэг жишээ):')
    print('жил | хонь | үхэр | хонин толгой | мөнгө')
    for h in r['hist']:
        print(' %d   | %4d | %3d  | %5d        | %s' % h)

# --- САНАЛ БОЛГОСОН ТЭНЦВЭР (docs/economy-mvp.md) ---
FINAL = dict(PROTO)
FINAL.update(milk_needs_calf=True, tea_share=1.0, grass_units='sheep', graze=0.12, overgraze=True,
             breed_age={'sheep': 1, 'cow': 2}, migrate=20000, hay_price=5000, daily_cash_cost=2000)

def trajectory(P, loss=0.07, n=200, years=6):
    acc = {}
    for s in range(n):
        r = run(P, make_policy(10**12), loss, s, years)
        for (y, sh, cw, su, mo) in r['hist']:
            acc.setdefault(y, []).append((sh, cw, su, mo))
    return {y: tuple(statistics.median(x[i] for x in L) for i in range(4)) for y, L in acc.items()}

if __name__ == '__main__' and 'final' in sys.argv:
    print('=== САНАЛ ===')
    for loss, nm in [(0.03, 'сайн'), (0.07, 'дунд'), (0.15, 'муу')]:
        summarize(f'Гэр 2 сая + 40 хонин толгой, тоглогч {nm}', FINAL, make_policy(2_000_000, herd_goal=40), loss)
    for y, v in sorted(trajectory(FINAL).items()):
        print(y, ['%.0f' % x for x in v])
