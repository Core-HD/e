funcs_to_run = {}


def task_deco(number: int):
    def wrapper(func):
        funcs_to_run[number] = func
        return func
    return wrapper


class Homework:
    @staticmethod
    @task_deco(1)
    def solution1() -> int:
        for x in range(1, 3001):
            num = 9**150+9**30-x
            counter = 0
            while num > 0:
                if num%9 == 0:
                    counter += 1
                num //= 9
            if counter == 122:
                counter = x
                break
        return counter


    @staticmethod
    @task_deco(2)
    def solution2() -> int:
        num = 5*1296**597+8*216**314-4*36**215+9*6**214-7*6**18-54
        num36 = list()
        while num > 0:
            num36.append(num % 36)
            num //= 36
        counter = 0
        for digit in num36:
            if digit <= 7:
                counter += 1
        return counter


    @staticmethod
    @task_deco(3)
    def solution3() -> int:
        num = 2**2048+32**102-8*4**128
        num32 = list()
        while num > 0:
            num32.append(num % 32)
            num //= 32
        counter = 0
        for digit in num32:
            if digit >= 10:
                counter += 1
        return counter


    @staticmethod
    @task_deco(4)
    def solution4() -> int:
        num = abs(18 * 7 ** 108 - 5 * 49 ** 76 + 343 ** 35 - 50)
        num49 = list()
        while num > 0:
            num49.append(num % 49)
            num //= 49
        return sum(num49)


    @staticmethod
    @task_deco(5)
    def solution5() -> int:
        N, W = int('N', 36), int('W', 36)
        Y, A, R = int('Y', 36), int('A', 36), int('R', 36)
        for x in range(189, -1, -1):
            for y in range(189, -1, -1):
                num1 = N * 190 ** 2 + x * 190 + W
                num2 = Y * 190 ** 3 + y * 190 ** 2 + A * 190 + R
                total = num1 + num2

                if total % 189 == 0:
                    return total // 189


    @staticmethod
    @task_deco(6)
    def solution6() -> int:
        for x in range(38, -1, -1):
            for y in range(38, -1, -1):
                num = 1*39**7+2*39**6+x*39**5+4*39**4+5*39**3+6*39**2+y*39+8
                if num % 38 == 0:
                    return x*39+y


def run_main() -> None:
    for num, func in funcs_to_run.items():
        print(f"{num} задание: {func()}")

if __name__ == "__main__":
    run_main()