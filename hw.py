# 6)
a = (2**345 + 8**65 - 4**130) * (8**123 - 2**89 + 4**45)
sum_numbers = 0
while a > 0:
    sum_numbers += a % 8
    a //= 8
print("6)", sum_numbers)


# 7)перебор x
for x in range(11):
    a = 3*11**4 + 3*11**3 + 6*11**2 + 4*11 + x
    b = x*12**4 + 7*12**3 + 9*12**2 + 4*12 + 6
    c = 5*14**4 + 5*14**3 + x*14**2 + 8*14 + 7
    if a + b == c:
        print("7) x =", x)
        print("7) Ответ =", c)


# 8)
lst=[]
for i in range(1, 3001):
    number = 9*11**210+8*11**150-i
    counter = 0
    while number > 0:
        counter += 1 if number % 11 == 0 else 0
        number //= 11
    if counter == 60:
        lst.append(i)
print("8)", max(lst))


# 9)
number = (17 * 125**453 + 117 * 5**231 - 3 * 5**13 - 2357)
counter = 0
while number > 0:
    digit = number % 125
    number //= 125
    if digit < 37:
        counter += 1
print("9)" ,counter)